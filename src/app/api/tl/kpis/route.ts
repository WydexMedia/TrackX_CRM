import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongoClient";
import { authenticateToken, createUnauthorizedResponse } from "@/lib/authMiddleware";
import { getTenantContextFromRequest } from "@/lib/mongoTenant";

export async function GET(req: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateToken(req as any);
    
    console.log('🔐 KPI API Auth Result:', {
      success: authResult.success,
      user: authResult.user,
      error: authResult.error,
      errorCode: authResult.errorCode,
      statusCode: authResult.statusCode
    });
    
    if (!authResult.success) {
      console.error('❌ KPI API Auth Failed:', authResult.error, authResult.errorCode);
      return createUnauthorizedResponse(authResult.error || 'Authentication failed', authResult.errorCode, authResult.statusCode);
    }

    const { user } = authResult;
    
    console.log('👤 KPI API User from JWT:', user);
    
    // Get tenant context
    const { tenantId } = await getTenantContextFromRequest(req as any);
    
    console.log('🏢 Tenant Context:', { tenantId, userTenantSubdomain: user?.tenantSubdomain });
    console.log('🔄 KPI API - Updated version with tenant matching fix');
    
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const db = await getMongoDb();
    
    // Verify user role from database (in case JWT is stale)
    const { ObjectId } = require('mongodb');
    const dbUser = await db.collection("users").findOne({ 
      _id: new ObjectId(user?.userId),
      tenantId 
    });
    
    console.log('👤 KPI API User from DB:', {
      id: dbUser?._id,
      email: dbUser?.email,
      role: dbUser?.role
    });
    
    // Check if user is a team leader (check both JWT and DB)
    const effectiveRole = dbUser?.role || user?.role;
    
    if (effectiveRole !== "teamleader") {
      console.error('❌ KPI API Role Check Failed:', {
        jwtRole: user?.role,
        dbRole: dbUser?.role,
        effectiveRole,
        required: 'teamleader'
      });
      return NextResponse.json({ 
        error: `Forbidden - Access denied. Your role is '${effectiveRole}' but 'teamleader' is required. Please log out and log back in with a team leader account.` 
      }, { status: 403 });
    }
    
    console.log('✅ KPI API Auth Success - User is team leader');

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const salesPersonIds = searchParams.get("salesPersonIds");

    // Build match conditions for date filtering
    const dateMatch: any = {};
    if (startDate) {
      dateMatch.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateMatch.$lte = end;
    }

    // Fetch all sales data - handle both tenantId and tenantSubdomain
    const salesMatch: any = { 
      $or: [
        { tenantId },
        { tenantSubdomain: user?.tenantSubdomain }
      ]
    };
    if (Object.keys(dateMatch).length > 0) {
      salesMatch.createdAt = dateMatch;
    }

    const salesData = await db.collection("sales").find(salesMatch).toArray();
    console.log('📊 Sales Data Found:', {
      count: salesData.length,
      match: salesMatch,
      sample: salesData.slice(0, 2)
    });

    // Fetch all daily reports - handle both tenantId and tenantSubdomain
    const reportsMatch: any = { 
      $or: [
        { tenantId },
        { tenantSubdomain: user?.tenantSubdomain }
      ]
    };
    if (Object.keys(dateMatch).length > 0) {
      reportsMatch.date = dateMatch;
    }

    const dailyReports = await db.collection("dailyReports").find(reportsMatch).toArray();
    console.log('📊 Daily Reports Found:', {
      count: dailyReports.length,
      match: reportsMatch,
      sample: dailyReports.slice(0, 2)
    });

    // Get all users (salespersons) - handle both tenantId and tenantSubdomain
    const users = await db.collection("users")
      .find({ 
        $or: [
          { tenantId },
          { tenantSubdomain: user?.tenantSubdomain }
        ],
        role: { $ne: "teamleader" } 
      })
      .toArray();
    console.log('👥 Users Found:', {
      count: users.length,
      tenantId,
      users: users.map((u: any) => ({ id: u._id, name: u.name, role: u.role }))
    });

    // Filter by specific salesPersonIds if provided
    let targetUsers = users;
    if (salesPersonIds) {
      const idsArray = salesPersonIds.split(',');
      targetUsers = users.filter((user: any) => idsArray.includes(user._id.toString()));
    }

    // Calculate KPIs for each salesperson
    const kpiData = targetUsers.map((user: any) => {
      const userName = user.name.toLowerCase();
      console.log(`🔍 Processing user: ${user.name} (${userName})`);
      
      // Get sales for this user
      const userSales = salesData.filter(
        (sale: any) => sale.ogaName?.toLowerCase() === userName
      );
      console.log(`💰 Sales for ${user.name}:`, {
        count: userSales.length,
        sales: userSales.map((s: any) => ({ ogaName: s.ogaName, amount: s.amount, date: s.createdAt }))
      });

      // Create a map of daily sales
      const dailySalesMap = new Map();
      const dailySalesCountMap = new Map();
      
      userSales.forEach((sale: any) => {
        if (sale.createdAt) {
          const saleDate = new Date(sale.createdAt).toISOString().split('T')[0];
          const existingAmount = dailySalesMap.get(saleDate) || 0;
          const existingCount = dailySalesCountMap.get(saleDate) || 0;
          dailySalesMap.set(saleDate, existingAmount + (sale.amount || 0));
          dailySalesCountMap.set(saleDate, existingCount + 1);
        }
      });

      // Get all unique dates from both daily reports and sales data
      const allDates = new Set<string>();
      
      // Add dates from daily reports
      dailyReports.forEach((report: any) => {
        if (report.salespersons?.some((sp: any) => 
          sp.name.toLowerCase() === userName
        )) {
          allDates.add(new Date(report.date).toISOString().split('T')[0]);
        }
      });
      
      // Add dates from sales data
      userSales.forEach((sale: any) => {
        if (sale.createdAt) {
          allDates.add(new Date(sale.createdAt).toISOString().split('T')[0]);
        }
      });

      // Create comprehensive daily data
      const dailyKPIs = Array.from(allDates).map((dateStr) => {
        const date = new Date(dateStr);
        const dailyAmount = dailySalesMap.get(dateStr) || 0;
        const salesCount = dailySalesCountMap.get(dateStr) || 0;
        
        // Find corresponding daily report data
        const dailyReport = dailyReports.find((report: any) => {
          const reportDate = new Date(report.date).toISOString().split('T')[0];
          return reportDate === dateStr && report.salespersons?.some((sp: any) => 
            sp.name.toLowerCase() === userName
          );
        });
        
        const salesPersonData = dailyReport?.salespersons?.find((sp: any) => 
          sp.name.toLowerCase() === userName
        );
        
        const leadsAssigned = salesPersonData?.prospects || 0;
        const conversionRate = leadsAssigned > 0 ? ((salesCount / leadsAssigned) * 100).toFixed(1) : '0';
        const adSpend = leadsAssigned * 50;
        const adSpendPercentage = dailyAmount > 0 ? ((adSpend / dailyAmount) * 100).toFixed(1) : '0';

        return {
          date: date.toISOString(),
          dailyAmount,
          salesCount,
          leadsAssigned,
          salesConverted: salesCount,
          conversionRate: parseFloat(conversionRate),
          adSpend,
          adSpendPercentage: parseFloat(adSpendPercentage)
        };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Calculate totals
      const totalLeads = dailyKPIs.reduce((sum, day) => sum + day.leadsAssigned, 0);
      const totalSales = dailyKPIs.reduce((sum, day) => sum + day.salesConverted, 0);
      const totalAmount = dailyKPIs.reduce((sum, day) => sum + day.dailyAmount, 0);
      const totalAdSpend = dailyKPIs.reduce((sum, day) => sum + day.adSpend, 0);
      const overallConversion = totalLeads > 0 ? ((totalSales / totalLeads) * 100).toFixed(1) : '0';
      const overallAdSpendPercentage = totalAmount > 0 ? ((totalAdSpend / totalAmount) * 100).toFixed(1) : '0';

      return {
        userId: user._id.toString(),
        name: user.name,
        code: user.code,
        email: user.email,
        dailyKPIs,
        summary: {
          totalLeads,
          totalSales,
          totalAmount,
          totalAdSpend,
          overallConversion: parseFloat(overallConversion),
          overallAdSpendPercentage: parseFloat(overallAdSpendPercentage),
          daysActive: dailyKPIs.length
        }
      };
    });

    // Calculate team totals
    const teamSummary: any = {
      totalLeads: kpiData.reduce((sum: number, user: any) => sum + user.summary.totalLeads, 0),
      totalSales: kpiData.reduce((sum: number, user: any) => sum + user.summary.totalSales, 0),
      totalAmount: kpiData.reduce((sum: number, user: any) => sum + user.summary.totalAmount, 0),
      totalAdSpend: kpiData.reduce((sum: number, user: any) => sum + user.summary.totalAdSpend, 0),
      totalSalespeople: kpiData.length,
    };

    teamSummary.overallConversion = teamSummary.totalLeads > 0 
      ? parseFloat(((teamSummary.totalSales / teamSummary.totalLeads) * 100).toFixed(1))
      : 0;

    teamSummary.overallAdSpendPercentage = teamSummary.totalAmount > 0
      ? parseFloat(((teamSummary.totalAdSpend / teamSummary.totalAmount) * 100).toFixed(1))
      : 0;

    console.log('📊 KPI API Response:', {
      kpiDataCount: kpiData.length,
      teamSummary,
      salesPersonIds,
      firstKPI: kpiData[0]
    });

    return NextResponse.json({
      success: true,
      kpiData,
      teamSummary
    });
  } catch (error) {
    console.error("Error fetching KPI data:", error);
    return NextResponse.json(
      { error: "Failed to fetch KPI data" },
      { status: 500 }
    );
  }
}

