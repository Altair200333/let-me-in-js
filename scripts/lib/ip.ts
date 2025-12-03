/**
 * Get current public IP address using external service
 */
export async function getCurrentIp(): Promise<string> {
  // Using multiple services as fallback
  const services = [
    "https://api.ipify.org",
    "https://icanhazip.com",
    "https://ifconfig.me/ip",
  ];

  for (const service of services) {
    try {
      const response = await fetch(service);
      if (response.ok) {
        const ip = (await response.text()).trim();
        // Basic validation
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
          return ip;
        }
      }
    } catch {
      // Try next service
      continue;
    }
  }

  throw new Error("Failed to determine current public IP address");
}

