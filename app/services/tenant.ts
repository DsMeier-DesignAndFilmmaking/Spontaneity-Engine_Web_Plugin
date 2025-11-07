/**
 * Tenant Management Service
 * Handles API key validation and tenant ID resolution
 */

// In-memory tenant registry (for testing)
// In production, this would be stored in Firestore or environment variables
const TENANT_REGISTRY: Map<string, { tenantId: string; name: string; enabled: boolean }> = new Map([
  // Demo tenants for testing
  ["demo-key-1", { tenantId: "tenant-1", name: "Demo Tenant 1", enabled: true }],
  ["demo-key-2", { tenantId: "tenant-2", name: "Demo Tenant 2", enabled: true }],
  ["test-key", { tenantId: "test-tenant", name: "Test Tenant", enabled: true }],
]);

/**
 * Validate API key and return tenant information
 */
export function validateApiKey(apiKey: string | null | undefined): {
  valid: boolean;
  tenantId?: string;
  name?: string;
  error?: string;
} {
  if (!apiKey) {
    return { valid: false, error: "API key is required" };
  }

  const tenant = TENANT_REGISTRY.get(apiKey);
  if (!tenant) {
    return { valid: false, error: "Invalid API key" };
  }

  if (!tenant.enabled) {
    return { valid: false, error: "Tenant is disabled" };
  }

  return {
    valid: true,
    tenantId: tenant.tenantId,
    name: tenant.name,
  };
}

/**
 * Get tenant ID from API key or direct tenantId
 */
export function getTenantId(apiKey?: string | null, tenantId?: string | null): string | null {
  // If tenantId is provided directly, use it
  if (tenantId) {
    return tenantId;
  }

  // Otherwise, validate API key and extract tenantId
  if (apiKey) {
    const validation = validateApiKey(apiKey);
    if (validation.valid && validation.tenantId) {
      return validation.tenantId;
    }
  }

  return null;
}

/**
 * Get tenant-specific AI prompt template
 */
export function getTenantPromptTemplate(tenantId: string | null): string {
  // Default prompt template
  const defaultTemplate = `Generate one spontaneous local travel event near {location}.`;

  // Tenant-specific templates (can be stored in database)
  const tenantTemplates: Record<string, string> = {
    "tenant-1": `Generate a fun, family-friendly local travel event near {location}. Focus on activities suitable for all ages.`,
    "tenant-2": `Generate an adventurous, outdoor-focused local travel event near {location}. Emphasize active experiences and nature.`,
    "test-tenant": `Generate a unique, local experience near {location} that showcases the authentic culture of the area.`,
  };

  if (tenantId && tenantTemplates[tenantId]) {
    return tenantTemplates[tenantId];
  }

  return defaultTemplate;
}

/**
 * Get tenant-specific branding/configuration
 */
export function getTenantConfig(tenantId: string | null): {
  mapboxStyle?: string;
  primaryColor?: string;
  aiPromptTemplate?: string;
} {
  const configs: Record<string, any> = {
    "tenant-1": {
      primaryColor: "#3b82f6", // Blue
      aiPromptTemplate: "Generate a family-friendly event...",
    },
    "tenant-2": {
      primaryColor: "#10b981", // Green
      aiPromptTemplate: "Generate an adventurous outdoor event...",
    },
  };

  return configs[tenantId || ""] || {};
}

/**
 * List all tenants (for testing/admin)
 */
export function listTenants(): Array<{ tenantId: string; name: string; enabled: boolean }> {
  return Array.from(TENANT_REGISTRY.values());
}

