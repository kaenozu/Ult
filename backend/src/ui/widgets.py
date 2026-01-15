"""
Reusable UI Widgets
Modern, consistent components for the dashboard.
"""

import streamlit as st
from typing import Optional, Callable
from src.ui.design_system import DS


def metric_card(
    label: str,
    value: str,
    delta: Optional[str] = None,
    delta_color: Optional[str] = None,
    icon: Optional[str] = None,
    help_text: Optional[str] = None,
):
    """
    Enhanced metric card with custom styling.

    Args:
        label: Metric label
        value: Main value to display
        delta: Change value (e.g., "+5.2%")
        delta_color: Color for delta (auto-detected if None)
        icon: Emoji icon
        help_text: Tooltip text
    """
    # Auto-detect delta color
    if delta and not delta_color:
        try:
            delta_num = float(delta.replace("%", "").replace("+", ""))
            delta_color = DS.get_metric_color(delta_num)
        except Exception:
            delta_color = DS.COLORS["text_secondary"]

    # Build HTML
    card_html = f"""
    <div style="
        background: {DS.COLORS['surface']};
        border-radius: {DS.RADIUS['lg']};
        padding: {DS.SPACING['lg']};
        border: 1px solid {DS.COLORS['border']};
        transition: {DS.TRANSITIONS['normal']};
    ">
        <div style="display: flex; align-items: center; gap: {DS.SPACING['sm']};">
            {f'<span style="font-size: {DS.TYPOGRAPHY["font_size_xl"]};">{icon}</span>' if icon else ''}
            <span style="
                color: {DS.COLORS['text_secondary']};
                font-size: {DS.TYPOGRAPHY['font_size_sm']};
                font-weight: {DS.TYPOGRAPHY['font_weight_medium']};
                text-transform: uppercase;
                letter-spacing: 0.05em;
            ">{label}</span>
            {f'<span style="color: {DS.COLORS["text_muted"]}; cursor: help;" title="{help_text}">ⓘ</span>' if help_text else ''}
        </div>
        <div style="
            font-size: {DS.TYPOGRAPHY['font_size_xxl']};
            font-weight: {DS.TYPOGRAPHY['font_weight_bold']};
            color: {DS.COLORS['text']};
            margin-top: {DS.SPACING['sm']};
        ">{value}</div>
        {f'<div style="color: {delta_color}; font-size: {DS.TYPOGRAPHY["font_size_sm"]}; '
         f'margin-top: {DS.SPACING["xs"]};">{delta}</div>' if delta else ''}
    </div>
    """

    st.markdown(card_html, unsafe_allow_html=True)


def alert_banner(
    message: str,
    type: str = "info",
    dismissible: bool = False,
    icon: Optional[str] = None,
):
    """
    Alert banner for notifications.

    Args:
        message: Alert message
        type: 'info', 'success', 'warning', 'danger'
        dismissible: Show close button
        icon: Custom icon (auto-selected if None)
    """
    type_config = {
        "info": {"color": DS.COLORS["info"], "icon": "ℹ️"},
        "success": {"color": DS.COLORS["success"], "icon": "✅"},
        "warning": {"color": DS.COLORS["warning"], "icon": "⚠️"},
        "danger": {"color": DS.COLORS["danger"], "icon": "❌"},
    }

    config = type_config.get(type, type_config["info"])
    display_icon = icon or config["icon"]

    banner_html = f"""
    <div style="
        background: {config['color']}22;
        border-left: 4px solid {config['color']};
        border-radius: {DS.RADIUS['md']};
        padding: {DS.SPACING['md']};
        margin: {DS.SPACING['md']} 0;
        display: flex;
        align-items: center;
        gap: {DS.SPACING['md']};
    ">
        <span style="font-size: {DS.TYPOGRAPHY['font_size_lg']};">{display_icon}</span>
        <span style="flex: 1; color: {DS.COLORS['text']};">{message}</span>
        {f'<button style="background: none; border: none; color: {DS.COLORS["text_muted"]}; '
         f'cursor: pointer;">✕</button>' if dismissible else ''}
    </div>
    """

    st.markdown(banner_html, unsafe_allow_html=True)


def quick_action_button(
    label: str,
    icon: str,
    on_click: Optional[Callable] = None,
    variant: str = "primary",
    disabled: bool = False,
):
    """
    Quick action button with icon.

    Args:
        label: Button label
        icon: Emoji icon
        on_click: Click handler
        variant: 'primary', 'secondary', 'danger'
        disabled: Disabled state
    """
    {
        "primary": DS.COLORS["primary"],
        "secondary": DS.COLORS["surface"],
        "danger": DS.COLORS["danger"],
    }

    # Use Streamlit button with custom styling
    button_key = f"quick_action_{label.replace(' ', '_')}"

    if st.button(f"{icon} {label}", key=button_key, disabled=disabled, use_container_width=True):
        if on_click:
            on_click()


def skeleton_loader(height: str = "100px", count: int = 1):
    """
    Skeleton loading placeholder.

    Args:
        height: Height of skeleton
        count: Number of skeleton items
    """
    skeleton_html = ""
    for i in range(count):
        skeleton_html += f"""
        <div style="
            background: linear-gradient(90deg, {DS.COLORS['surface']} 25%,
                        {DS.COLORS['surface_hover']} 50%, {DS.COLORS['surface']} 75%);
            background-size: 200% 100%;
            animation: loading 1.5s ease-in-out infinite;
            border-radius: {DS.RADIUS['md']};
            height: {height};
            margin-bottom: {DS.SPACING['md']};
        "></div>
        """

    skeleton_html = f"""
    <style>
    @keyframes loading {{
        0% {{ background-position: 200% 0; }}
        100% {{ background-position: -200% 0; }}
    }}
    </style>
    {skeleton_html}
    """

    st.markdown(skeleton_html, unsafe_allow_html=True)


def mini_chart(data: list, color: str = None, height: int = 40, width: int = 100):
    """
    Mini sparkline chart.

    Args:
        data: List of values
        color: Line color
        height: Chart height in pixels
        width: Chart width in pixels
    """
    if not data:
        return

    color = color or DS.COLORS["primary"]

    # Normalize data to 0-1 range
    min_val = min(data)
    max_val = max(data)
    range_val = max_val - min_val if max_val != min_val else 1

    normalized = [(v - min_val) / range_val for v in data]

    # Create SVG path
    points = []
    step = width / (len(data) - 1) if len(data) > 1 else width

    for i, val in enumerate(normalized):
        x = i * step
        y = height - (val * height)
        points.append(f"{x},{y}")

    path = "M " + " L ".join(points)

    svg = f"""
    <svg width="{width}" height="{height}" style="display: block;">
        <path d="{path}" fill="none" stroke="{color}" stroke-width="2" />
    </svg>
    """

    st.markdown(svg, unsafe_allow_html=True)


def progress_ring(percentage: float, size: int = 60, stroke_width: int = 4, color: str = None):
    """
    Circular progress indicator.

    Args:
        percentage: Progress percentage (0-100)
        size: Ring diameter
        stroke_width: Ring thickness
        color: Ring color
    """
    color = color or DS.COLORS["primary"]
    percentage = max(0, min(100, percentage))

    radius = (size - stroke_width) / 2
    circumference = 2 * 3.14159 * radius
    offset = circumference - (percentage / 100 * circumference)

    svg = f"""
    <svg width="{size}" height="{size}">
        <circle
            cx ="{size / 2}"
            cy ="{size / 2}"
            r="{radius}"
            fill="none"
            stroke="{DS.COLORS['border']}"
            stroke-width="{stroke_width}"
        />
        <circle
            cx ="{size / 2}"
            cy ="{size / 2}"
            r="{radius}"
            fill="none"
            stroke="{color}"
            stroke-width="{stroke_width}"
            stroke-dasharray="{circumference}"
            stroke-dashoffset="{offset}"
            transform = "rotate(-90 {size / 2} {size / 2})"
            style="transition: stroke-dashoffset 0.5s ease;"
        />
        <text
            x="50%"
            y="50%"
            text-anchor="middle"
            dy=".3em"
            fill="{DS.COLORS['text']}"
            font-size="{size / 4}"
            font-weight="bold"
        >{int(percentage)}%</text>
    </svg>
    """

    st.markdown(svg, unsafe_allow_html=True)
