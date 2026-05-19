---
trigger: model_decision
description: the frontend design must be followed when adding and modifying UI pages, components, and layout.
---

All frontend UI must follow `frontend/DESIGN.md` — the single source of truth for colors, typography, spacing, components, and layout patterns. Key rules:
- Primary interactive color: Cloud Blue `#1677ff` only — no second accent
- Feature card colors signal domain: purple=AI, blue=compute, teal=data, dark=premium
- Body text 14px; headlines use PingFang SC / Microsoft YaHei at weight 600 with zero letter-spacing
- CSS Modules + Less variables should reference DESIGN.md tokens; never inline hex values