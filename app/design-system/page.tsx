"use client";

import React from "react";
import { colors } from "@/design-system/tokens/colors";
import { typography } from "@/design-system/tokens/typography";
import { spacing } from "@/design-system/tokens/spacing";
import { shadows } from "@/design-system/tokens/shadows";
import { radius, semanticRadius } from "@/design-system/tokens/radius";
import { Card, CardHeader, CardTitle, CardContent } from "@/design-system/components/Card";
import { Button } from "@/design-system/components/Button";

// Helper Components (moved before main component)
function Section({ title, id, children }: { title: string; id: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: spacing[16] }}>
      <h2 style={{
        ...typography.textStyles.h1,
        color: colors.semantic.text.primary,
        marginBottom: spacing[8],
        paddingBottom: spacing[4],
        borderBottom: `2px solid ${colors.semantic.border.default}`,
      }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: spacing[12] }}>
      <h3 style={{
        ...typography.textStyles.h3,
        color: colors.semantic.text.primary,
        marginBottom: spacing[6],
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function ColorGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
      gap: spacing[4],
    }}>
      {children}
    </div>
  );
}

function ColorSwatch({ 
  name, 
  value, 
  token, 
  description 
}: { 
  name: string; 
  value: string; 
  token: string;
  description?: string;
}) {
  return (
    <div style={{
      backgroundColor: colors.semantic.background.primary,
      borderRadius: semanticRadius.card,
      overflow: "hidden" as const,
      boxShadow: shadows.md,
    }}>
      <div style={{
        width: "100%",
        height: "120px",
        backgroundColor: value,
      }} />
      <div style={{ padding: spacing[4] }}>
        <div style={{
          ...typography.textStyles.body,
          fontWeight: typography.fontWeight.semibold,
          color: colors.semantic.text.primary,
          marginBottom: spacing[1],
        }}>
          {name}
        </div>
        <div style={{
          ...typography.textStyles.caption,
          color: colors.semantic.text.secondary,
          fontFamily: typography.fontFamily.mono,
          marginBottom: spacing[2],
        }}>
          {token}
        </div>
        <div style={{
          ...typography.textStyles.small,
          color: colors.semantic.text.tertiary,
          fontFamily: typography.fontFamily.mono,
          marginBottom: description ? spacing[2] : 0,
        }}>
          {value}
        </div>
        {description && (
          <div style={{
            ...typography.textStyles.caption,
            color: colors.semantic.text.secondary,
            marginTop: spacing[2],
          }}>
            {description}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <div style={{ 
      backgroundColor: colors.semantic.background.secondary,
      minHeight: "100vh",
      paddingTop: "80px",
      paddingBottom: spacing[16],
      fontFamily: typography.fontFamily.sans,
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: `0 ${spacing[6]}` }}>
        
        {/* Header */}
        <div style={{ 
          marginBottom: spacing[16],
          textAlign: "center" as const,
        }}>
          <h1 style={{
            ...typography.textStyles.display,
            color: colors.semantic.text.primary,
            marginBottom: spacing[4],
          }}>
            Travel Design System
          </h1>
          <p style={{
            ...typography.textStyles.bodyLarge,
            color: colors.semantic.text.secondary,
            maxWidth: "600px",
            margin: "0 auto",
          }}>
            A customizable, travel-themed token system with emotional and experiential design logic
          </p>
        </div>

        {/* Colors Section */}
        <Section title="Colors" id="colors">
          <SubSection title="Brand Colors">
            <ColorGrid>
              <ColorSwatch
                name="Discovery Blue"
                value={colors.brand.primary}
                token="brand.primary"
                description="Primary actions, links, trust"
              />
              <ColorSwatch
                name="Sunset Coral"
                value={colors.brand.secondary}
                token="brand.secondary"
                description="Secondary actions, highlights"
              />
              <ColorSwatch
                name="Adventure Teal"
                value={colors.brand.accent}
                token="brand.accent"
                description="Accents, callouts"
              />
            </ColorGrid>
          </SubSection>

          <SubSection title="Neutral Colors">
            <ColorGrid>
              <ColorSwatch
                name="Cloud White"
                value={colors.neutral.white}
                token="neutral.white"
              />
              <ColorSwatch
                name="Jet Black"
                value={colors.neutral.black}
                token="neutral.black"
              />
              {Object.entries(colors.neutral.gray).map(([key, value]) => (
                <ColorSwatch
                  key={key}
                  name={`Gray ${key}`}
                  value={value}
                  token={`neutral.gray.${key}`}
                />
              ))}
            </ColorGrid>
          </SubSection>

          <SubSection title="Status Colors">
            <ColorGrid>
              <ColorSwatch
                name="Success"
                value={colors.status.success}
                token="status.success"
              />
              <ColorSwatch
                name="Warning"
                value={colors.status.warning}
                token="status.warning"
              />
              <ColorSwatch
                name="Error"
                value={colors.status.error}
                token="status.error"
              />
              <ColorSwatch
                name="Info"
                value={colors.status.info}
                token="status.info"
              />
            </ColorGrid>
          </SubSection>

          <SubSection title="Travel Semantic Colors">
            <ColorGrid>
              {Object.entries(colors.travel).map(([key, value]) => (
                <ColorSwatch
                  key={key}
                  name={key.charAt(0).toUpperCase() + key.slice(1)}
                  value={value}
                  token={`travel.${key}`}
                />
              ))}
            </ColorGrid>
          </SubSection>
        </Section>

        {/* Typography Section */}
        <Section title="Typography" id="typography">
          <SubSection title="Font Families">
            <div style={{ 
              display: "grid", 
              gap: spacing[4],
              backgroundColor: colors.semantic.background.primary,
              padding: spacing[6],
              borderRadius: semanticRadius.card,
            }}>
              <div>
                <strong style={{ color: colors.semantic.text.secondary }}>Sans:</strong>
                <p style={{ 
                  fontFamily: typography.fontFamily.sans,
                  marginTop: spacing[2],
                  color: colors.semantic.text.primary,
                }}>
                  The quick brown fox jumps over the lazy dog
                </p>
              </div>
              <div>
                <strong style={{ color: colors.semantic.text.secondary }}>Display:</strong>
                <p style={{ 
                  fontFamily: typography.fontFamily.display,
                  marginTop: spacing[2],
                  color: colors.semantic.text.primary,
                }}>
                  The quick brown fox jumps over the lazy dog
                </p>
              </div>
              <div>
                <strong style={{ color: colors.semantic.text.secondary }}>Mono:</strong>
                <p style={{ 
                  fontFamily: typography.fontFamily.mono,
                  marginTop: spacing[2],
                  color: colors.semantic.text.primary,
                }}>
                  {`const theme = { colors: { primary: "#007AFF" } };`}
                </p>
              </div>
            </div>
          </SubSection>

          <SubSection title="Text Styles">
            <div style={{ 
              display: "grid", 
              gap: spacing[4],
              backgroundColor: colors.semantic.background.primary,
              padding: spacing[6],
              borderRadius: semanticRadius.card,
            }}>
              {Object.entries(typography.textStyles).slice(0, 6).map(([key, style]) => (
                <div key={key} style={{ borderBottom: `1px solid ${colors.semantic.border.default}`, paddingBottom: spacing[4] }}>
                  <div style={{ 
                    marginBottom: spacing[2],
                    color: colors.semantic.text.secondary,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                  }}>
                    {key}
                  </div>
                  <div style={{
                    ...style,
                    color: colors.semantic.text.primary,
                  }}>
                    {key === "display" ? "Display Heading" : 
                     key.startsWith("h") ? `Heading ${key.toUpperCase()}` :
                     key === "body" ? "Body text: The quick brown fox jumps over the lazy dog" :
                     key === "bodyLarge" ? "Large body text: The quick brown fox jumps over the lazy dog" :
                     key === "caption" ? "Caption text" :
                     key === "small" ? "Small text" :
                     key === "button" ? "Button Text" :
                     "Sample text"}
                  </div>
                </div>
              ))}
            </div>
          </SubSection>
        </Section>

        {/* Spacing Section */}
        <Section title="Spacing" id="spacing">
          <SubSection title="Base Scale (4px unit)">
            <div style={{ 
              backgroundColor: colors.semantic.background.primary,
              padding: spacing[6],
              borderRadius: semanticRadius.card,
            }}>
              {Object.entries(spacing).slice(0, 12).map(([key, value]) => (
                <div key={key} style={{ 
                  marginBottom: spacing[4],
                  display: "flex",
                  alignItems: "center",
                  gap: spacing[4],
                }}>
                  <div style={{ 
                    width: "100px",
                    color: colors.semantic.text.secondary,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                  }}>
                    spacing.{key}
                  </div>
                  <div style={{ 
                    width: "80px",
                    color: colors.semantic.text.tertiary,
                    fontSize: typography.fontSize.sm,
                  }}>
                    {value}
                  </div>
                  <div style={{ 
                    width: value,
                    height: "24px",
                    backgroundColor: colors.brand.primary,
                    borderRadius: radius.sm,
                  }} />
                </div>
              ))}
            </div>
          </SubSection>
        </Section>

        {/* Shadows Section */}
        <Section title="Shadows" id="shadows">
          <SubSection title="Elevation Levels">
            <div style={{ 
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: spacing[6],
            }}>
              {Object.entries(shadows)
                .filter(([key, value]) => typeof value === "string" && key !== "inner")
                .slice(0, 7)
                .map(([key, value]) => (
                <div key={key} style={{
                  backgroundColor: colors.semantic.background.primary,
                  padding: spacing[6],
                  borderRadius: semanticRadius.card,
                  boxShadow: value as string,
                  textAlign: "center" as const,
                }}>
                  <div style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.semantic.text.secondary,
                    marginBottom: spacing[2],
                  }}>
                    shadows.{key}
                  </div>
                  <div style={{
                    width: "100px",
                    height: "100px",
                    backgroundColor: colors.brand.primary,
                    borderRadius: radius.md,
                    margin: "0 auto",
                  }} />
                </div>
              ))}
            </div>
          </SubSection>

          <SubSection title="Brand Shadows">
            <div style={{ 
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: spacing[6],
            }}>
              {Object.entries(shadows.brand).map(([key, value]) => (
                <div key={key} style={{
                  backgroundColor: colors.semantic.background.primary,
                  padding: spacing[6],
                  borderRadius: semanticRadius.card,
                  boxShadow: value,
                  textAlign: "center" as const,
                }}>
                  <div style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.semantic.text.secondary,
                    marginBottom: spacing[2],
                  }}>
                    shadows.brand.{key}
                  </div>
                  <div style={{
                    width: "100px",
                    height: "100px",
                    backgroundColor: colors.brand[key as keyof typeof colors.brand] as string,
                    borderRadius: radius.md,
                    margin: "0 auto",
                  }} />
                </div>
              ))}
            </div>
          </SubSection>
        </Section>

        {/* Radius Section */}
        <Section title="Border Radius" id="radius">
          <SubSection title="Base Scale">
            <div style={{ 
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: spacing[6],
            }}>
              {Object.entries(radius).map(([key, value]) => (
                <div key={key} style={{
                  textAlign: "center" as const,
                }}>
                  <div style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.semantic.text.secondary,
                    marginBottom: spacing[2],
                  }}>
                    radius.{key}
                  </div>
                  <div style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.semantic.text.tertiary,
                    marginBottom: spacing[2],
                  }}>
                    {value}
                  </div>
                  <div style={{
                    width: "100px",
                    height: "100px",
                    backgroundColor: colors.brand.primary,
                    borderRadius: value,
                    margin: "0 auto",
                  }} />
                </div>
              ))}
            </div>
          </SubSection>
        </Section>

        {/* Components Section */}
        <Section title="Components" id="components">
          <SubSection title="Button Variants">
            <div style={{ 
              display: "flex",
              flexWrap: "wrap",
              gap: spacing[4],
            }}>
              <Button variant="primary" size="md">Primary</Button>
              <Button variant="secondary" size="md">Secondary</Button>
              <Button variant="accent" size="md">Accent</Button>
              <Button variant="outline" size="md">Outline</Button>
              <Button variant="ghost" size="md">Ghost</Button>
              <Button variant="danger" size="md">Danger</Button>
            </div>
          </SubSection>

          <SubSection title="Button Sizes">
            <div style={{ 
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: spacing[4],
            }}>
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary" size="md">Medium</Button>
              <Button variant="primary" size="lg">Large</Button>
            </div>
          </SubSection>

          <SubSection title="Card Variants">
            <div style={{ 
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: spacing[6],
            }}>
              <Card variant="default" padding="md">
                <CardHeader>
                  <CardTitle level={3}>Default Card</CardTitle>
                </CardHeader>
                <CardContent>
                  This is a default card with standard shadow and border.
                </CardContent>
              </Card>

              <Card variant="elevated" padding="md">
                <CardHeader>
                  <CardTitle level={3}>Elevated Card</CardTitle>
                </CardHeader>
                <CardContent>
                  This card has elevated shadow for more prominence.
                </CardContent>
              </Card>

              <Card variant="outlined" padding="md">
                <CardHeader>
                  <CardTitle level={3}>Outlined Card</CardTitle>
                </CardHeader>
                <CardContent>
                  This card uses an outlined border style.
                </CardContent>
              </Card>
            </div>
          </SubSection>
        </Section>

        {/* Footer */}
        <div style={{
          marginTop: spacing[16],
          textAlign: "center" as const,
          color: colors.semantic.text.secondary,
          ...typography.textStyles.caption,
        }}>
          <p>View the complete documentation in <code>/design-system/docs/</code></p>
        </div>

      </div>
    </div>
  );
}
