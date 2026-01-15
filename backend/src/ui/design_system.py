"""
Design System
Unified design tokens for consistent styling across the application.
"""


class DesignSystem:
    """Central design system with colors, spacing, typography, and component styles."""

    # Color Palette
    COLORS = {
        # Primary Colors
        "primary": "#00D9FF",  # Cyan - Buy signals, primary actions
        "primary_dark": "#00A8CC",  # Darker cyan for hover
        "primary_light": "#33E0FF",  # Lighter cyan for highlights
        # Semantic Colors
        "success": "#2ECC71",  # Green - Profit, success states
        "danger": "#FF4757",  # Red - Loss, sell signals, errors
        "warning": "#FFA502",  # Orange - Warnings, alerts
        "info": "#3498DB",  # Blue - Information
        # Neutral Colors
        "background": "#0E1117",  # Main background (Streamlit dark)
        "surface": "#1E2530",  # Card/panel background
        "surface_hover": "#262D3D",  # Hover state for cards
        "border": "#2D3748",  # Border color
        # Text Colors
        "text": "#FAFAFA",  # Primary text
        "text_secondary": "#B0B0B0",  # Secondary text
        "text_muted": "#6B7280",  # Muted/disabled text
        # Chart Colors
        "chart_up": "#26A69A",  # Bullish candle
        "chart_down": "#EF5350",  # Bearish candle
        "chart_grid": "#2D3748",  # Grid lines
    }

    # Spacing Scale (rem units)
    SPACING = {
        "xs": "0.25rem",  # 4px
        "sm": "0.5rem",  # 8px
        "md": "1rem",  # 16px
        "lg": "1.5rem",  # 24px
        "xl": "2rem",  # 32px
        "xxl": "3rem",  # 48px
    }

    # Typography
    TYPOGRAPHY = {
        "font_family": '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        "font_size_xs": "0.75rem",  # 12px
        "font_size_sm": "0.875rem",  # 14px
        "font_size_md": "1rem",  # 16px
        "font_size_lg": "1.125rem",  # 18px
        "font_size_xl": "1.25rem",  # 20px
        "font_size_xxl": "1.5rem",  # 24px
        "font_size_xxxl": "2rem",  # 32px
        "font_weight_normal": "400",
        "font_weight_medium": "500",
        "font_weight_semibold": "600",
        "font_weight_bold": "700",
    }

    # Border Radius
    RADIUS = {
        "sm": "0.25rem",  # 4px
        "md": "0.5rem",  # 8px
        "lg": "0.75rem",  # 12px
        "xl": "1rem",  # 16px
        "full": "9999px",  # Fully rounded
    }

    # Shadows
    SHADOWS = {
        "sm": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        "md": "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        "lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
        "xl": "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        "glow": "0 0 20px rgba(0, 217, 255, 0.3)",  # Cyan glow
    }

    # Transitions
    TRANSITIONS = {
        "fast": "150ms ease-in-out",
        "normal": "250ms ease-in-out",
        "slow": "350ms ease-in-out",
    }

    @classmethod
    def get_css_variables(cls) -> str:
        """Generate CSS custom properties for the design system."""
        css_vars = [":root {"]

        # Colors
        for name, value in cls.COLORS.items():
            css_vars.append(f"  --color-{name.replace('_', '-')}: {value};")

        # Spacing
        for name, value in cls.SPACING.items():
            css_vars.append(f"  --spacing-{name}: {value};")

        # Typography
        for name, value in cls.TYPOGRAPHY.items():
            css_vars.append(f"  --{name.replace('_', '-')}: {value};")

        # Radius
        for name, value in cls.RADIUS.items():
            css_vars.append(f"  --radius-{name}: {value};")

        # Shadows
        for name, value in cls.SHADOWS.items():
            css_vars.append(f"  --shadow-{name}: {value};")

        # Transitions
        for name, value in cls.TRANSITIONS.items():
            css_vars.append(f"  --transition-{name}: {value};")

        css_vars.append("}")
        return "\n".join(css_vars)

    @classmethod
    def get_metric_color(cls, value: float, is_percentage: bool = False) -> str:
        """Get appropriate color for a metric value (positive = green, negative = red)."""
        if value > 0:
            return cls.COLORS["success"]
        elif value < 0:
            return cls.COLORS["danger"]
        else:
            return cls.COLORS["text_secondary"]

    @classmethod
    def get_risk_color(cls, risk_level: str) -> str:
        """Get color for risk level."""
        risk_colors = {
            "low": cls.COLORS["success"],
            "medium": cls.COLORS["warning"],
            "high": cls.COLORS["danger"],
        }
        return risk_colors.get(risk_level.lower(), cls.COLORS["text_secondary"])


# Export for easy access
DS = DesignSystem
