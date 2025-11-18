export function normalizeCsvToUtf8(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
  
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) return reject("Failed to read file");
  
        const uint = new Uint8Array(buffer);
  
        let encoding = "utf-8";
        let offset = 0;
  
        // Detect BOM
        if (uint[0] === 0xEF && uint[1] === 0xBB && uint[2] === 0xBF) {
          encoding = "utf-8";
          offset = 3;
        } else if (uint[0] === 0xFF && uint[1] === 0xFE) {
          encoding = "utf-16le";
          offset = 2;
        } else if (uint[0] === 0xFE && uint[1] === 0xFF) {
          encoding = "utf-16be";
          offset = 2;
        } else {
          encoding = "utf-8";
        }
  
        const decoder = new TextDecoder(encoding);
        const text = decoder.decode(buffer.slice(offset));
  
        resolve(text);
      };
  
      reader.onerror = () => reject("Error reading file");
      reader.readAsArrayBuffer(file);
    });
  }