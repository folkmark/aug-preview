/* @ds-bundle: {"format":4,"namespace":"AugmentEDDesignSystem_191b99","components":[{"name":"Button","sourcePath":"components/actions/Button.jsx"},{"name":"Badge","sourcePath":"components/display/Badge.jsx"},{"name":"SectionHeading","sourcePath":"components/display/SectionHeading.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Label","sourcePath":"components/forms/Label.jsx"},{"name":"RadioGroup","sourcePath":"components/forms/RadioGroup.jsx"},{"name":"RadioGroupItem","sourcePath":"components/forms/RadioGroup.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"Icon","sourcePath":"components/foundations/Icon.jsx"}],"sourceHashes":{"components/actions/Button.jsx":"f802fb7732c9","components/display/Badge.jsx":"44af5bed863b","components/display/SectionHeading.jsx":"111f7b7b408a","components/forms/Checkbox.jsx":"5052597f126e","components/forms/Input.jsx":"401d5bd5dca2","components/forms/Label.jsx":"fdaa848c60b0","components/forms/RadioGroup.jsx":"5739978ad66a","components/forms/Select.jsx":"afd15789c88c","components/forms/Textarea.jsx":"36bb3b0fb406","components/foundations/Icon.jsx":"f4d7d83f5aec","ui_kits/website/Chrome.jsx":"17676ea2c5dd","ui_kits/website/GetInvolvedPage.jsx":"c6272d2a4787","ui_kits/website/HomePage.jsx":"b7f191b6c616","ui_kits/website/InnerPages.jsx":"3c0a402a27b0","ui_kits/website/ResearchPage.jsx":"0e2bf84175c5"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.AugmentEDDesignSystem_191b99 = window.AugmentEDDesignSystem_191b99 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/actions/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
const base = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.75rem",
  borderRadius: "var(--radius-button)",
  whiteSpace: "nowrap",
  transition: "all var(--transition-fast)",
  fontFamily: "var(--font-body)",
  fontSize: "inherit",
  lineHeight: "var(--text-body-line-height)",
  border: "1px solid transparent",
  background: "none",
  color: "inherit"
};
const VARIANTS = {
  default: {
    rest: {
      borderColor: "var(--color-st-tropaz)",
      backgroundColor: "var(--color-st-tropaz)",
      color: "var(--color-scheme-btn-text, var(--color-white))",
      fontWeight: "var(--font-weight-medium)"
    },
    hover: {
      borderColor: "var(--color-st-tropaz-dark)",
      backgroundColor: "var(--color-st-tropaz-dark)"
    }
  },
  alternate: {
    rest: {
      borderColor: "var(--color-white)",
      backgroundColor: "var(--color-white)",
      color: "var(--color-neutral-darkest)",
      fontWeight: "var(--font-weight-medium)"
    },
    hover: {
      borderColor: "var(--color-neutral-lighter)",
      backgroundColor: "var(--color-neutral-lighter)"
    }
  },
  secondary: {
    rest: {
      backgroundColor: "var(--color-neutral-darkest-5)",
      fontWeight: "var(--font-weight-medium)",
      backdropFilter: "blur(var(--blur-glass))"
    },
    hover: {
      backgroundColor: "var(--color-neutral-darkest-15)"
    }
  },
  "secondary-alt": {
    rest: {
      backgroundColor: "var(--color-white-10)",
      fontWeight: "var(--font-weight-medium)",
      backdropFilter: "blur(var(--blur-glass))",
      color: "var(--color-white)"
    },
    hover: {
      borderColor: "var(--color-neutral-lighter)",
      backgroundColor: "var(--color-white-20)"
    }
  },
  link: {
    rest: {
      gap: "0.5rem",
      color: "var(--color-scheme-text, var(--text-body))"
    },
    hover: {
      opacity: 0.7
    }
  },
  "link-alt": {
    rest: {
      gap: "0.5rem",
      color: "var(--color-white)"
    },
    hover: {
      opacity: 0.7
    }
  },
  ghost: {
    rest: {},
    hover: {
      backgroundColor: "var(--color-neutral-darkest)",
      color: "var(--color-white)"
    }
  },
  none: {
    rest: {},
    hover: {}
  }
};
const SIZES = {
  default: {
    padding: "0.375rem 0.75rem"
  },
  sm: {
    padding: "0.25rem 0.625rem"
  },
  lg: {
    padding: "0.5rem 1.5rem"
  },
  link: {
    padding: 0
  },
  icon: {
    width: "2.5rem",
    height: "2.5rem",
    padding: 0
  },
  none: {}
};
function Button({
  variant = "default",
  size = "default",
  as = "button",
  iconLeft,
  iconRight,
  disabled,
  children,
  style,
  ...props
}) {
  const [hover, setHover] = useState(false);
  const v = VARIANTS[variant] || VARIANTS.default;
  const Comp = as;
  return /*#__PURE__*/React.createElement(Comp, _extends({
    "data-slot": "button",
    "data-variant": variant,
    disabled: Comp === "button" ? disabled : undefined,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      ...base,
      ...(SIZES[size] || SIZES.default),
      ...v.rest,
      ...(hover && !disabled ? v.hover : null),
      ...(disabled ? {
        opacity: 0.5,
        pointerEvents: "none"
      } : null),
      ...style
    }
  }, props), iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Button.jsx", error: String((e && e.message) || e) }); }

// components/display/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const base = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: "var(--radius-badge)",
  padding: "0.25rem 0.5rem",
  fontSize: "var(--text-small)",
  fontWeight: "var(--font-weight-semibold)",
  border: "1px solid transparent",
  fontFamily: "var(--font-body)"
};
const VARIANTS = {
  default: {
    backgroundColor: "var(--color-neutral-darkest-5)",
    color: "var(--color-neutral-darkest)",
    backdropFilter: "blur(var(--blur-glass))"
  },
  alt: {
    borderColor: "var(--color-white-10)",
    backgroundColor: "var(--color-white-10)",
    color: "var(--color-white)",
    backdropFilter: "blur(var(--blur-glass))"
  },
  outline: {
    borderColor: "var(--color-scheme-border, var(--border-hairline))",
    color: "var(--color-scheme-text, var(--text-body))"
  }
};
function Badge({
  variant = "default",
  children,
  style,
  ...props
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    "data-slot": "badge",
    style: {
      ...base,
      ...(VARIANTS[variant] || VARIANTS.default),
      ...style
    }
  }, props), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/display/SectionHeading.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Section eyebrow + heading + optional lede. The recurring AugmentED section opener. */
function SectionHeading({
  eyebrow,
  heading,
  lede,
  align = "left",
  as = "h2",
  maxWidth = "48rem",
  style,
  ...props
}) {
  const Heading = as;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      maxWidth,
      textAlign: align,
      marginInline: align === "center" ? "auto" : undefined,
      ...style
    }
  }, props), eyebrow ? /*#__PURE__*/React.createElement("p", {
    style: {
      fontWeight: "var(--font-weight-semibold)",
      fontSize: "var(--text-regular)",
      marginBottom: "1rem"
    }
  }, eyebrow) : null, /*#__PURE__*/React.createElement(Heading, {
    style: {
      fontSize: "var(--text-h2)",
      lineHeight: "var(--text-h2-line-height)",
      letterSpacing: "var(--heading-letter-spacing)",
      fontWeight: "var(--font-weight-bold)"
    }
  }, heading), lede ? /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--text-medium)",
      lineHeight: "var(--text-body-line-height)",
      marginTop: "1rem"
    }
  }, lede) : null);
}
Object.assign(__ds_scope, { SectionHeading });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/SectionHeading.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const field = {
  display: "flex",
  width: "100%",
  minHeight: "2rem",
  padding: "0.5rem 0",
  background: "transparent",
  border: 0,
  borderBottom: "1px solid var(--color-neutral-darkest-15)",
  color: "var(--color-scheme-text, var(--text-body))",
  fontFamily: "var(--font-body)",
  fontSize: "var(--text-regular)",
  lineHeight: "var(--text-body-line-height)",
  outline: "none",
  transition: "all var(--transition-fast)"
};
const secondary = {
  borderBottomColor: "var(--color-white-10)",
  color: "var(--color-white)"
};
function Input({
  icon,
  iconPosition = "left",
  prefix,
  prefixPosition = "left",
  variant = "primary",
  disabled,
  style,
  ...props
}) {
  const affix = {
    minHeight: "2.75rem",
    flexShrink: 0,
    padding: "0.5rem 0.75rem",
    borderTop: "1px solid var(--color-scheme-border, var(--border-hairline))",
    borderBottom: "1px solid var(--color-scheme-border, var(--border-hairline))",
    fontSize: "var(--text-regular)",
    display: "flex",
    alignItems: "center"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      width: "100%",
      alignItems: "center"
    }
  }, icon && iconPosition === "left" ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: "0.75rem",
      display: "flex"
    }
  }, icon) : null, prefix && prefixPosition === "left" ? /*#__PURE__*/React.createElement("div", {
    style: {
      ...affix,
      borderLeft: "1px solid var(--color-scheme-border, var(--border-hairline))"
    }
  }, prefix) : null, /*#__PURE__*/React.createElement("input", _extends({
    "data-slot": "input",
    disabled: disabled,
    style: {
      ...field,
      ...(variant === "secondary" ? secondary : null),
      ...(icon ? iconPosition === "left" ? {
        paddingLeft: "2.75rem",
        paddingRight: "0.75rem"
      } : {
        paddingRight: "2.75rem",
        paddingLeft: "0.75rem"
      } : null),
      ...(prefix ? {
        flexGrow: 1
      } : null),
      ...(disabled ? {
        opacity: 0.5,
        cursor: "not-allowed"
      } : null),
      ...style
    }
  }, props)), icon && iconPosition === "right" ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: "0.75rem",
      display: "flex"
    }
  }, icon) : null, prefix && prefixPosition === "right" ? /*#__PURE__*/React.createElement("div", {
    style: {
      ...affix,
      borderRight: "1px solid var(--color-scheme-border, var(--border-hairline))"
    }
  }, prefix) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Label.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Label({
  children,
  style,
  ...props
}) {
  return /*#__PURE__*/React.createElement("label", _extends({
    "data-slot": "label",
    style: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      userSelect: "none",
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-regular)",
      lineHeight: "var(--text-body-line-height)",
      ...style
    }
  }, props), children);
}
Object.assign(__ds_scope, { Label });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Label.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Textarea({
  variant = "primary",
  disabled,
  style,
  ...props
}) {
  return /*#__PURE__*/React.createElement("textarea", _extends({
    "data-slot": "textarea",
    disabled: disabled,
    style: {
      display: "flex",
      width: "100%",
      minHeight: "2rem",
      padding: "0.5rem 0",
      background: "transparent",
      border: 0,
      borderBottom: `1px solid ${variant === "secondary" ? "var(--color-white-10)" : "var(--color-neutral-darkest-15)"}`,
      borderRadius: "var(--radius-form)",
      color: variant === "secondary" ? "var(--color-white)" : "var(--color-scheme-text, var(--text-body))",
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-regular)",
      lineHeight: "var(--text-body-line-height)",
      outline: "none",
      resize: "vertical",
      transition: "all var(--transition-fast)",
      ...(disabled ? {
        opacity: 0.5,
        cursor: "not-allowed"
      } : null),
      ...style
    }
  }, props));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/foundations/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: 20,
  md: 24,
  lg: 32
};

/* Material Symbols Rounded glyph. Substitutes the source's `relume-icons` set. */
function Icon({
  name,
  size = "md",
  fill = 0,
  weight = 400,
  color,
  style,
  className = "",
  ...rest
}) {
  const px = typeof size === "number" ? size : SIZES[size] || 24;
  return /*#__PURE__*/React.createElement("span", _extends({
    className: `ds-icon ${className}`,
    "aria-hidden": "true",
    style: {
      fontSize: px,
      width: px,
      height: px,
      color: color || "inherit",
      flexShrink: 0,
      fontVariationSettings: `"FILL" ${fill}, "wght" ${weight}, "GRAD" 0, "opsz" ${px}`,
      ...style
    }
  }, rest), name);
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/foundations/Icon.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
function Checkbox({
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled,
  alternate = false,
  id,
  style,
  ...props
}) {
  const [internal, setInternal] = useState(defaultChecked);
  const [hover, setHover] = useState(false);
  const on = checked === undefined ? internal : checked;
  const toggle = () => {
    if (disabled) return;
    if (checked === undefined) setInternal(!on);
    onCheckedChange && onCheckedChange(!on);
  };
  const onBg = alternate ? "var(--color-white)" : "var(--color-neutral-darkest)";
  const onFg = alternate ? "var(--color-neutral-darkest)" : "var(--color-white)";
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    role: "checkbox",
    id: id,
    "aria-checked": on,
    "data-slot": "checkbox",
    "data-state": on ? "checked" : "unchecked",
    disabled: disabled,
    onClick: toggle,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      width: "1.125rem",
      height: "1.125rem",
      flexShrink: 0,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "var(--radius-checkbox)",
      border: `1px solid ${alternate ? "var(--color-white-20)" : "var(--color-neutral-darkest-15)"}`,
      backgroundColor: on ? onBg : hover && !disabled ? alternate ? "var(--color-white-10)" : "var(--color-neutral-darkest-5)" : "transparent",
      color: onFg,
      padding: 0,
      outline: "none",
      transition: "all var(--transition-fast)",
      ...(disabled ? {
        opacity: 0.5,
        cursor: "not-allowed"
      } : null),
      ...style
    }
  }, props), on ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 16
  }) : null);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/RadioGroup.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  createContext,
  useContext,
  useState
} = React;
const Ctx = createContext({
  value: undefined,
  setValue: () => {}
});
function RadioGroup({
  value,
  defaultValue,
  onValueChange,
  children,
  style,
  ...props
}) {
  const [internal, setInternal] = useState(defaultValue);
  const current = value === undefined ? internal : value;
  const setValue = v => {
    if (value === undefined) setInternal(v);
    onValueChange && onValueChange(v);
  };
  return /*#__PURE__*/React.createElement(Ctx.Provider, {
    value: {
      value: current,
      setValue
    }
  }, /*#__PURE__*/React.createElement("div", _extends({
    role: "radiogroup",
    "data-slot": "radio-group",
    style: {
      display: "grid",
      gap: "0.5rem",
      ...style
    }
  }, props), children));
}
function RadioGroupItem({
  value,
  id,
  shape = "dot",
  disabled,
  alternate = false,
  style,
  ...props
}) {
  const ctx = useContext(Ctx);
  const [hover, setHover] = useState(false);
  const on = ctx.value === value;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    role: "radio",
    id: id,
    "aria-checked": on,
    "data-slot": "radio-group-item",
    "data-state": on ? "checked" : "unchecked",
    disabled: disabled,
    onClick: () => !disabled && ctx.setValue(value),
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      width: "1.125rem",
      height: "1.125rem",
      flexShrink: 0,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "9999px",
      border: `1px solid ${alternate ? "var(--color-white-20)" : "var(--color-neutral-darkest-15)"}`,
      backgroundColor: on ? alternate ? "var(--color-white)" : "var(--color-neutral-darkest)" : hover && !disabled ? alternate ? "var(--color-white-10)" : "var(--color-neutral-darkest-5)" : "transparent",
      color: alternate ? "var(--color-neutral-darkest)" : "var(--color-white)",
      padding: 0,
      outline: "none",
      transition: "all var(--transition-fast)",
      ...(disabled ? {
        opacity: 0.5,
        cursor: "not-allowed"
      } : null),
      ...style
    }
  }, props), on ? shape === "check" ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 16
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      width: "0.5rem",
      height: "0.5rem",
      borderRadius: "9999px",
      backgroundColor: "currentColor"
    }
  }) : null);
}
Object.assign(__ds_scope, { RadioGroup, RadioGroupItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/RadioGroup.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useEffect,
  useRef,
  useState
} = React;
/* Cosmetic recreation of the source's Radix select: underline trigger, hairline popover. */
function Select({
  options = [],
  value,
  defaultValue,
  onValueChange,
  placeholder = "Select",
  variant = "primary",
  disabled,
  style,
  ...props
}) {
  const [internal, setInternal] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = value === undefined ? internal : value;
  const selected = options.find(o => o.value === current);
  useEffect(() => {
    const onDoc = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const pick = v => {
    if (value === undefined) setInternal(v);
    onValueChange && onValueChange(v);
    setOpen(false);
  };
  const text = variant === "secondary" ? "var(--color-white)" : "var(--color-scheme-text, var(--text-body))";
  return /*#__PURE__*/React.createElement("div", _extends({
    ref: ref,
    style: {
      position: "relative",
      width: "100%",
      ...style
    }
  }, props), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-slot": "select-trigger",
    "data-state": open ? "open" : "closed",
    disabled: disabled,
    onClick: () => setOpen(!open),
    style: {
      display: "flex",
      width: "100%",
      minHeight: "2rem",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "0.25rem",
      padding: "0.5rem 0",
      background: "transparent",
      border: 0,
      borderBottom: `1px solid ${variant === "secondary" ? "var(--color-white-10)" : "var(--color-neutral-darkest-15)"}`,
      borderRadius: "var(--radius-form)",
      color: selected ? text : "var(--color-neutral-darkest-60)",
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-regular)",
      whiteSpace: "nowrap",
      outline: "none",
      transition: "all var(--transition-fast)",
      ...(disabled ? {
        opacity: 0.5,
        cursor: "not-allowed"
      } : null)
    }
  }, /*#__PURE__*/React.createElement("span", null, selected ? selected.label : placeholder), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "keyboard_arrow_down",
    size: 20,
    style: {
      color: text,
      transform: open ? "rotate(180deg)" : "none",
      transition: "transform var(--transition-fade)"
    }
  })), open ? /*#__PURE__*/React.createElement("div", {
    "data-slot": "select-content",
    style: {
      position: "absolute",
      zIndex: 50,
      top: "calc(100% + 0.25rem)",
      left: 0,
      minWidth: "100%",
      maxHeight: "24rem",
      overflowY: "auto",
      padding: "0.25rem",
      border: "1px solid var(--color-scheme-border, var(--border-hairline))",
      backgroundColor: "var(--color-scheme-background, var(--surface-page))",
      color: "var(--color-scheme-text, var(--text-body))",
      animation: "none"
    }
  }, options.map(o => /*#__PURE__*/React.createElement(SelectItem, {
    key: o.value,
    option: o,
    selected: o.value === current,
    onPick: pick
  }))) : null);
}
function SelectItem({
  option,
  selected,
  onPick
}) {
  const [hover, setHover] = useState(false);
  return /*#__PURE__*/React.createElement("div", {
    role: "option",
    "aria-selected": selected,
    "data-slot": "select-item",
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    onClick: () => !option.disabled && onPick(option.value),
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      width: "100%",
      padding: "0.5rem 0.75rem",
      paddingRight: "2rem",
      fontSize: "var(--text-regular)",
      cursor: option.disabled ? "not-allowed" : "default",
      opacity: option.disabled ? 0.5 : 1,
      backgroundColor: hover ? "var(--color-scheme-foreground, var(--surface-card))" : "transparent",
      userSelect: "none"
    }
  }, /*#__PURE__*/React.createElement("span", null, option.label), selected ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 20,
    style: {
      position: "absolute",
      right: "0.5rem"
    }
  }) : null);
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Chrome.jsx
try { (() => {
function ds() {
  return window.AugmentEDDesignSystem_191b99;
}
const LOGO = "../../assets/logo/logo-light.png";
const NAV = [["challenge", "The Challenge"], ["approach", "Our Approach"], ["team", "Who We Are"], ["involved", "Get involved"]];
function Placeholder({
  ratio = "3 / 2",
  radius = "var(--radius-image)",
  style
}) {
  const {
    Icon
  } = ds();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      aspectRatio: ratio,
      width: "100%",
      background: "var(--color-neutral-lightest)",
      borderRadius: radius,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      ...style
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "image",
    size: 48,
    color: "var(--color-neutral-lighter)",
    fill: 1
  }));
}
function Nav({
  route,
  go
}) {
  const {
    Button
  } = ds();
  const [open, setOpen] = React.useState(false);
  const nav = r => {
    setOpen(false);
    go(r);
  };
  return /*#__PURE__*/React.createElement("section", {
    className: "scheme-1",
    style: {
      position: "sticky",
      top: 0,
      zIndex: 999,
      display: "flex",
      minHeight: "4.5rem",
      width: "100%",
      alignItems: "center",
      paddingInline: "5%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginInline: "auto",
      display: "flex",
      width: "100%",
      minWidth: 0,
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      nav("home");
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: LOGO,
    alt: "augment^ed",
    style: {
      width: 168,
      display: "block"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "1rem"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    style: {
      padding: "0.5rem 1.5rem"
    },
    onClick: () => nav("involved")
  }, "Follow Our Research"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(!open),
    "aria-label": "Menu",
    style: {
      marginRight: "-0.5rem",
      display: "flex",
      width: "3rem",
      height: "3rem",
      alignItems: "center",
      justifyContent: "center",
      background: "none",
      border: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "flex",
      width: "1.5rem",
      height: "1.5rem",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 3,
      height: 2,
      width: open ? 0 : "100%",
      background: "var(--color-scheme-text)",
      transition: "width 100ms ease-in"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      height: 2,
      width: "100%",
      background: "var(--color-scheme-text)",
      transform: `rotate(${open ? 135 : 0}deg)`,
      transition: "transform 300ms ease-in-out"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      height: 2,
      width: "100%",
      background: "var(--color-scheme-text)",
      transform: `rotate(${open ? 45 : 0}deg)`,
      transition: "transform 300ms ease-in-out"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      bottom: 3,
      height: 2,
      width: open ? 0 : "100%",
      background: "var(--color-scheme-text)",
      transition: "width 100ms ease-in"
    }
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "scheme-1",
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      top: "100%",
      height: "calc(100vh - 4.5rem)",
      overflow: "hidden",
      opacity: open ? 1 : 0,
      visibility: open ? "visible" : "hidden",
      transition: "opacity 300ms ease-in-out"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      height: "100%",
      flexDirection: "column",
      paddingInline: "5%",
      paddingTop: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "auto 0",
      display: "grid",
      gap: "0.25rem",
      textAlign: "center"
    }
  }, NAV.map(([r, label]) => /*#__PURE__*/React.createElement("a", {
    key: r,
    href: "#",
    onClick: e => {
      e.preventDefault();
      nav(r);
    },
    style: {
      padding: "0.5rem 0",
      fontSize: "var(--text-h1)",
      fontWeight: "var(--font-weight-bold)",
      letterSpacing: "var(--heading-letter-spacing)",
      lineHeight: 1.1
    }
  }, label))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      minHeight: "4.5rem",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "1rem"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      nav("research");
    },
    className: "link-underline",
    style: {
      fontSize: "var(--text-h6)",
      textDecoration: "underline"
    }
  }, "Research"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "0.875rem"
    }
  }, ["linkedin", "x", "youtube", "instagram", "facebook"].map(s => /*#__PURE__*/React.createElement("a", {
    key: s,
    href: "#",
    onClick: e => e.preventDefault()
  }, /*#__PURE__*/React.createElement("img", {
    src: `https://unpkg.com/simple-icons@11.14.0/icons/${s}.svg`,
    width: "22",
    height: "22",
    alt: s
  }))))))));
}
function Footer({
  go
}) {
  const {
    Button,
    Input
  } = ds();
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  return /*#__PURE__*/React.createElement("footer", {
    className: "scheme-1",
    style: {
      paddingInline: "5%",
      paddingTop: "5rem",
      paddingBottom: "5rem"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "0.75fr 1fr",
      columnGap: "8vw",
      rowGap: "1rem",
      paddingBottom: "5rem"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      go("home");
    },
    style: {
      marginBottom: "1.5rem"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: LOGO,
    alt: "augment^ed",
    style: {
      width: 168
    }
  })), /*#__PURE__*/React.createElement("p", {
    style: {
      marginBottom: "1.5rem"
    }
  }, "Get updates on AugmentED research and tools."), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth: "35rem"
    }
  }, /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      setSent(true);
    },
    style: {
      marginBottom: "0.75rem",
      display: "grid",
      gridTemplateColumns: "1fr max-content",
      columnGap: "1rem",
      alignItems: "end"
    }
  }, /*#__PURE__*/React.createElement(Input, {
    type: "email",
    placeholder: "Your email",
    value: email,
    onChange: e => setEmail(e.target.value),
    required: true
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    type: "submit"
  }, sent ? "Subscribed" : "Subscribe")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--text-tiny)"
    }
  }, "By subscribing you agree to our Privacy Policy and consent to receive updates from AugmentED."))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      alignItems: "start",
      columnGap: "2rem",
      rowGap: "1rem"
    }
  }, [["Explore", ["The Challenge", "Our Approach", "Who We Are", "Research", "Get Involved"]], ["AERDF", ["Partnerships", "Careers", "Contact"]]].map(([head, items]) => /*#__PURE__*/React.createElement("div", {
    key: head,
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      marginBottom: "1rem",
      fontWeight: "var(--font-weight-semibold)",
      fontSize: "var(--text-regular)"
    }
  }, head), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: "none",
      margin: 0,
      padding: 0
    }
  }, items.map(i => /*#__PURE__*/React.createElement("li", {
    key: i,
    style: {
      fontSize: "var(--text-small)",
      padding: "0.5rem 0"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault()
  }, i)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      marginBottom: "1rem",
      fontWeight: "var(--font-weight-semibold)",
      fontSize: "var(--text-regular)"
    }
  }, "Follow Us"), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: "none",
      margin: 0,
      padding: 0
    }
  }, [["linkedin", "LinkedIn"], ["youtube", "Youtube"]].map(([s, label]) => /*#__PURE__*/React.createElement("li", {
    key: label,
    style: {
      fontSize: "var(--text-small)",
      padding: "0.5rem 0"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      display: "flex",
      alignItems: "center",
      gap: "0.75rem"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: `https://unpkg.com/simple-icons@11.14.0/icons/${s}.svg`,
    width: "22",
    height: "22",
    alt: ""
  }), /*#__PURE__*/React.createElement("span", null, label)))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      width: "100%",
      background: "var(--color-scheme-border)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--text-small)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: "2rem"
    }
  }, /*#__PURE__*/React.createElement("p", null, "\xA9 2025 AugmentED. All rights reserved."), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: "none",
      display: "flex",
      gap: "1.5rem",
      margin: 0,
      padding: 0
    }
  }, ["Cookie settings", "Terms of service", "Privacy policy"].map(t => /*#__PURE__*/React.createElement("li", {
    key: t
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      textDecoration: "underline"
    }
  }, t)))))));
}
Object.assign(window, {
  ds,
  Nav,
  Footer,
  Placeholder,
  LOGO,
  NAV
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Chrome.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/GetInvolvedPage.jsx
try { (() => {
function GetInvolvedPage() {
  const {
    Button,
    Checkbox,
    Input,
    Label,
    RadioGroup,
    RadioGroupItem,
    Select,
    Textarea
  } = ds();
  const [role, setRole] = React.useState("");
  const [agreed, setAgreed] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const labelStyle = {
    marginBottom: "0.5rem"
  };
  const fieldRow = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1.5rem"
  };
  if (sent) {
    return /*#__PURE__*/React.createElement("section", {
      className: "scheme-1 section"
    }, /*#__PURE__*/React.createElement("div", {
      className: "container",
      style: {
        maxWidth: "var(--container-lg)",
        textAlign: "center"
      }
    }, /*#__PURE__*/React.createElement("p", {
      className: "eyebrow"
    }, "Connect"), /*#__PURE__*/React.createElement("h2", {
      style: {
        marginBottom: "1.5rem"
      }
    }, "Thank you for subscribing to AugmentED."), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: "var(--text-medium)"
      }
    }, "We'll send research findings and prototype updates as they're published. Nothing else."), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: "2rem",
        display: "flex",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      onClick: () => setSent(false)
    }, "Submit another response"))));
  }
  return /*#__PURE__*/React.createElement("section", {
    className: "scheme-1 section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: {
      maxWidth: "var(--container-lg)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginInline: "auto",
      marginBottom: "3rem",
      width: "100%",
      maxWidth: "var(--container-lg)",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "eyebrow"
  }, "Connect"), /*#__PURE__*/React.createElement("h2", {
    style: {
      marginBottom: "1.5rem"
    }
  }, "Stay in the loop"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--text-medium)"
    }
  }, "Get updates on our work and research findings.")), /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      setSent(true);
    },
    style: {
      display: "grid",
      gap: "1.5rem"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: fieldRow
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid"
    }
  }, /*#__PURE__*/React.createElement(Label, {
    htmlFor: "firstName",
    style: labelStyle
  }, "First name"), /*#__PURE__*/React.createElement(Input, {
    type: "text",
    id: "firstName"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid"
    }
  }, /*#__PURE__*/React.createElement(Label, {
    htmlFor: "lastName",
    style: labelStyle
  }, "Last name"), /*#__PURE__*/React.createElement(Input, {
    type: "text",
    id: "lastName"
  }))), /*#__PURE__*/React.createElement("div", {
    style: fieldRow
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid"
    }
  }, /*#__PURE__*/React.createElement(Label, {
    htmlFor: "email",
    style: labelStyle
  }, "Email"), /*#__PURE__*/React.createElement(Input, {
    type: "email",
    id: "email",
    required: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid"
    }
  }, /*#__PURE__*/React.createElement(Label, {
    htmlFor: "phone",
    style: labelStyle
  }, "Contact number"), /*#__PURE__*/React.createElement(Input, {
    type: "text",
    id: "phone"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid"
    }
  }, /*#__PURE__*/React.createElement(Label, {
    style: labelStyle
  }, "Primary interest area"), /*#__PURE__*/React.createElement(Select, {
    placeholder: "Select one...",
    options: [{
      value: "first",
      label: "First Choice"
    }, {
      value: "second",
      label: "Second Choice"
    }, {
      value: "third",
      label: "Third Choice"
    }]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      paddingBlock: "1rem"
    }
  }, /*#__PURE__*/React.createElement(Label, {
    style: {
      marginBottom: "1rem"
    }
  }, "Which best describes you?"), /*#__PURE__*/React.createElement(RadioGroup, {
    value: role,
    onValueChange: setRole,
    style: {
      gridTemplateColumns: "1fr 1fr 1fr",
      columnGap: "1.5rem",
      rowGap: "0.875rem"
    }
  }, [["educator", "Educator"], ["researcher", "Researcher"], ["engineer", "Engineer"], ["administrator", "Administrator"], ["nonprofit", "Non-Profit Professional"], ["executive", "Company Executive"], ["funder", "Funder"], ["journalist", "Journalist"], ["other", "Other"]].map(([v, l]) => /*#__PURE__*/React.createElement(Label, {
    key: v,
    htmlFor: v
  }, /*#__PURE__*/React.createElement(RadioGroupItem, {
    value: v,
    id: v
  }), l)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid"
    }
  }, /*#__PURE__*/React.createElement(Label, {
    htmlFor: "message",
    style: labelStyle
  }, "Tell us more"), /*#__PURE__*/React.createElement(Textarea, {
    id: "message",
    placeholder: "Share what brought you here...",
    style: {
      minHeight: "11.25rem"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      fontSize: "var(--text-small)",
      marginBottom: "1rem"
    }
  }, /*#__PURE__*/React.createElement(Checkbox, {
    id: "terms",
    checked: agreed,
    onCheckedChange: setAgreed
  }), /*#__PURE__*/React.createElement(Label, {
    htmlFor: "terms",
    style: {
      cursor: "pointer"
    }
  }, "I agree to the privacy policy")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    type: "submit",
    disabled: !agreed
  }, "Subscribe")))));
}
Object.assign(window, {
  GetInvolvedPage
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/GetInvolvedPage.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/HomePage.jsx
try { (() => {
const BLOCKS = [{
  src: "../../assets/images/home-hero-0.png",
  w: "22vw",
  left: "0",
  top: "58%",
  speed: 0.22
}, {
  src: "../../assets/images/home-hero-1.png",
  w: "22vw",
  left: "58vw",
  top: "76%",
  speed: 0.34
}, {
  src: "../../assets/images/home-hero-2.png",
  w: "20vw",
  left: "4vw",
  top: "104%",
  speed: 0.28
}, {
  src: "../../assets/images/home-hero-3.png",
  w: "18vw",
  left: "64vw",
  top: "118%",
  speed: 0.4
}, {
  src: "../../assets/images/home-hero-4.png",
  w: "20vw",
  left: "26vw",
  top: "88%",
  speed: 0.18,
  dim: true
}, {
  src: "../../assets/images/home-hero-5.png",
  w: "18vw",
  left: "40vw",
  top: "126%",
  speed: 0.3,
  dim: true
}];
function Hero({
  go
}) {
  const {
    Button
  } = ds();
  const [y, setY] = React.useState(0);
  React.useEffect(() => {
    const onScroll = () => setY(window.scrollY);
    window.addEventListener("scroll", onScroll, {
      passive: true
    });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return /*#__PURE__*/React.createElement("section", {
    className: "scheme-1",
    style: {
      position: "relative",
      overflow: "hidden",
      height: "100vh",
      paddingInline: "5%"
    }
  }, BLOCKS.map((b, i) => /*#__PURE__*/React.createElement("img", {
    key: i,
    src: b.src,
    alt: "",
    style: {
      position: "absolute",
      left: b.left,
      top: b.top,
      width: b.w,
      opacity: b.dim ? 0.75 : 1,
      transform: `translateY(${-y * b.speed}px)`,
      pointerEvents: "none"
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: {
      position: "relative",
      zIndex: 20,
      display: "flex",
      height: "100%",
      maxWidth: "var(--container-lg)",
      alignItems: "center",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      marginBottom: "1.5rem"
    }
  }, "Bridging frontier AI and the classroom."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--text-medium)"
    }
  }, "AugmentED is an R&D organization closing the gap between what AI can do and what students need. We are teachers, researchers, and engineers working together to build and test the missing technology, and the evidence to trust it."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "2rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "1rem"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    onClick: () => go("involved")
  }, "Follow our work"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    onClick: () => go("approach")
  }, "Explore our approach")))));
}
function ChallengeStatement({
  go
}) {
  const {
    Button,
    Icon
  } = ds();
  return /*#__PURE__*/React.createElement("section", {
    className: "scheme-1 section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: {
      maxWidth: "var(--container-lg)",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "eyebrow"
  }, "The Challenge"), /*#__PURE__*/React.createElement("h5", {
    style: {
      marginBottom: "1.5rem"
    }
  }, "Frontier AI models weren't purpose-built for education, leaving a gap between what AI can do and what students need. Closing it requires a missing layer between those models and the apps they power: infrastructure built for learning, proven in classrooms, and worthy of trust."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "2rem",
      display: "flex",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "link",
    size: "link",
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "chevron_right",
      size: 20
    }),
    onClick: () => go("challenge")
  }, "Learn More"))));
}
const CYCLE = [["Define the role", "AI can play many distinct roles in a classroom, and each requires its own standards, evidence, and safeguards. With each group of teachers and students, we identify a specific role AI could play to meet a real need, and what teachers uniquely bring alongside it. Then we study what that role requires, where its limits are, and what bar it must meet.", "1 / 1"], ["Build the capabilities", "Much of the technology needed for AI to play these roles well doesn't exist off the shelf. We build the missing layer between frontier AI models and classroom apps — validated capabilities that tools can build on, like computational methods that help AI measure student skills or track how concepts connect across a semester.", "3 / 2"], ["Co-design the applications", "Teachers, researchers, engineers, and designers build classroom tools on those capabilities, along with new ways of teaching alongside them. They then test our work where it counts: in real classrooms.", "3 / 4"], ["Test, learn, begin again.", "Classroom data tells us whether the AI roles we selected and the capabilities and tools we built actually helped. Those lessons sharpen our hypotheses, strengthen our capabilities and tools, and inform our next cycle of R&D.", "3 / 2"]];
function Approach({
  go
}) {
  const {
    Button,
    Icon
  } = ds();
  return /*#__PURE__*/React.createElement("section", {
    className: "scheme-1 section",
    style: {
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: "5rem",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      columnGap: "4rem"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "eyebrow"
  }, "Our Approach"), /*#__PURE__*/React.createElement("h2", null, "We treat AI in education as a science, not a gold rush.")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "12rem"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--text-medium)"
    }
  }, "We run an iterative research and development cycle, with educators, researchers, and engineers as equal partners at every step. We don't start by asking what AI can do. We start by asking what teachers and students need. Then educators, researchers, and engineers work together to identify what's missing, build it, and test it in real classrooms. What we learn informs the next turn of the cycle."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "2rem",
      display: "flex",
      gap: "1rem"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "link",
    size: "link",
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "chevron_right",
      size: 20
    }),
    onClick: () => go("approach")
  }, "Learn More")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      alignItems: "start",
      gap: "4rem"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: "7rem"
    }
  }, [CYCLE[0], CYCLE[1]].map(([h, p, ratio]) => /*#__PURE__*/React.createElement("div", {
    key: h,
    style: {
      display: "flex",
      maxWidth: "25rem",
      flexDirection: "column",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement(Placeholder, {
    ratio: ratio,
    style: {
      marginBottom: "2rem"
    }
  }), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: "var(--text-h4)",
      marginBottom: "1rem"
    }
  }, h), /*#__PURE__*/React.createElement("p", null, p)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: "7rem",
      justifySelf: "end",
      marginTop: "50%"
    }
  }, [CYCLE[2], CYCLE[3]].map(([h, p, ratio]) => /*#__PURE__*/React.createElement("div", {
    key: h,
    style: {
      display: "flex",
      maxWidth: "25rem",
      flexDirection: "column",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement(Placeholder, {
    ratio: ratio,
    style: {
      marginBottom: "2rem"
    }
  }), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: "var(--text-h4)",
      marginBottom: "1rem"
    }
  }, h), /*#__PURE__*/React.createElement("p", null, p)))))));
}
const SHARE = [["Better ways of thinking.", "Ideas and evidence that help the field reason about AI in education: research insights on the roles AI should (and shouldn't) play, methods for evaluating AI, and tested models for teaching and learning alongside it."], ["Better foundations for AI tools.", "Reusable infrastructure that future classroom tools can be built on, from validated AI capabilities to the datasets that power them. We build these to generalize and recombine to serve many subjects and types of schools."], ["Better tools and classroom practices.", "Tested classroom resources that help educators apply AI, including AI-powered applications, implementation guides, and proven methods for teaching alongside AI, all built with teachers to solve real challenges in their classrooms."]];
function WhatWeShare() {
  return /*#__PURE__*/React.createElement("section", {
    className: "scheme-1 section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: "5rem",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      alignItems: "start",
      columnGap: "5rem"
    }
  }, /*#__PURE__*/React.createElement("h2", null, "Turning classroom experiments into reusable infrastructure."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--text-medium)"
    }
  }, "Each co-design cycle produces more than prototypes. It creates evidence about what students need, what AI can do reliably, and what teachers need to use it well. AugmentED turns those lessons into research and technical foundations the field can trust and build on.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      alignItems: "start",
      columnGap: "3rem"
    }
  }, SHARE.map(([h, p]) => /*#__PURE__*/React.createElement("div", {
    key: h
  }, /*#__PURE__*/React.createElement(Placeholder, {
    ratio: "3 / 2",
    style: {
      marginBottom: "2rem"
    }
  }), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: "var(--text-h4)",
      marginBottom: "1.5rem"
    }
  }, h), /*#__PURE__*/React.createElement("p", null, p))))));
}
const PROJECTS = [["Cross Town High", "Connection Builder", "Students learn more deeply when new material connects to what they already know and care about. This tool maps a teacher's course material to each student's knowledge, experiences, and interests and then suggests personalized connections."], ["Museum High School", "Feedback Facilitator", "During multi-week projects, students respond to teacher prompts with short voice memos. The tool surfaces where each student and group is progressing, stuck, or drifting off track, so teachers can provide specific, meaningful feedback for every student."], ["High Tech High Mesa & High Tech High International", "Collaboration Navigator", "After students reflect on their small-group work, the tool generates insights about how each group is functioning. It makes group dynamics visible to teachers in real time, so they can coach students on collaboration and repair problems before they harden."]];
function CurrentWork({
  go
}) {
  const {
    Button,
    Icon
  } = ds();
  return /*#__PURE__*/React.createElement("section", {
    className: "scheme-1 section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: "5rem",
      maxWidth: "var(--container-lg)"
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "eyebrow"
  }, "Our Current Work"), /*#__PURE__*/React.createElement("h2", {
    style: {
      marginBottom: "1rem"
    }
  }, "Examples of what we're building right now."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--text-medium)",
      marginBottom: "1.5rem"
    }
  }, "In our first cohort, teachers from several pioneering high schools worked with researchers and engineers to co-design AI-powered tools. Each project below is a work in progress\u2014and each one feeds reusable capabilities back into a foundation that others can build on."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--text-medium)"
    }
  }, "All three put the same AI role\u2014AI as cognitive extender\u2014to work. For teachers and students, the AI surfaces patterns hidden in more information than any person could track alone.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      columnGap: "2rem"
    }
  }, PROJECTS.map(([school, title, body]) => /*#__PURE__*/React.createElement("div", {
    key: title,
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      textAlign: "start"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      marginBottom: "1.5rem",
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement(Placeholder, {
    ratio: "3 / 2"
  })), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--text-small)",
      fontWeight: "var(--font-weight-semibold)",
      marginBottom: "1rem"
    }
  }, school), /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      marginBottom: "0.5rem"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: "var(--text-h5)"
    }
  }, title)), /*#__PURE__*/React.createElement("p", null, body), /*#__PURE__*/React.createElement(Button, {
    variant: "link",
    size: "link",
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "chevron_right",
      size: 20
    }),
    style: {
      marginTop: "1.5rem"
    },
    onClick: () => go("research")
  }, "Learn more"))))));
}
function HomeCta({
  go
}) {
  const {
    Button
  } = ds();
  return /*#__PURE__*/React.createElement("section", {
    className: "scheme-1 section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: {
      maxWidth: "var(--container-lg)",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      marginBottom: "1.5rem"
    }
  }, "Join us in building better foundations for AI in education."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--text-medium)"
    }
  }, "We co-design with educators, publish what we learn, and build infrastructure for the whole field. If that's the future of AI in education you want, come build it with us."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "2rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "1rem"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    onClick: () => go("team")
  }, "Meet the team"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    onClick: () => go("involved")
  }, "Follow our work"))));
}
function HomePage({
  go
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Hero, {
    go: go
  }), /*#__PURE__*/React.createElement(ChallengeStatement, {
    go: go
  }), /*#__PURE__*/React.createElement(Approach, {
    go: go
  }), /*#__PURE__*/React.createElement(WhatWeShare, null), /*#__PURE__*/React.createElement(CurrentWork, {
    go: go
  }), /*#__PURE__*/React.createElement(ResearchTeaser, {
    go: go
  }), /*#__PURE__*/React.createElement(HomeCta, {
    go: go
  }));
}
Object.assign(window, {
  HomePage,
  Hero,
  Approach,
  CurrentWork,
  WhatWeShare,
  HomeCta,
  ChallengeStatement
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/HomePage.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/InnerPages.jsx
try { (() => {
function ChallengePage({
  go
}) {
  const {
    Button,
    Icon
  } = ds();
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("section", {
    className: "scheme-1 section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: {
      maxWidth: "var(--container-lg)"
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      marginBottom: "1.5rem"
    }
  }, "The gap between what AI can do and what students need."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--text-medium)"
    }
  }, "AI is arriving in classrooms whether schools are ready or not. The danger is that some are rushing in without asking what AI can do well, what teachers uniquely bring, or what students actually need."))), /*#__PURE__*/React.createElement("section", {
    className: "scheme-1 section",
    style: {
      paddingTop: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      columnGap: "5rem",
      alignItems: "center",
      marginBottom: "7rem"
    }
  }, /*#__PURE__*/React.createElement(Placeholder, {
    ratio: "1 / 1"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      marginBottom: "1.5rem"
    }
  }, "Nobody knows the right way for AI to enter the classroom."), /*#__PURE__*/React.createElement("p", {
    style: {
      marginBottom: "1.5rem"
    }
  }, "Most of us built our critical thinking, writing ability, and judgment without AI, which is what allows us to use it well now. We direct it rather than defer to it. Students who lean on AI too early can short-circuit those skills before they form."), /*#__PURE__*/React.createElement("p", null, "It's a safe bet that AI can improve how people learn. But nobody has discovered how. The entire field fundamentally lacks research into the right ways to integrate AI into the classroom."))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      columnGap: "5rem",
      alignItems: "center",
      marginBottom: "7rem"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      marginBottom: "1.5rem"
    }
  }, "And the technology to support it is lacking."), /*#__PURE__*/React.createElement("p", null, "Ed tech companies build the apps teachers and students use. The big AI labs build the underlying models that power these apps. What's missing is the layer in between: the foundational capabilities that let AI understand what a student knows, measure skills as complex as critical thinking, and adapt to what's happening in a real classroom.")), /*#__PURE__*/React.createElement(Placeholder, {
    ratio: "1 / 1"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      columnGap: "5rem",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(Placeholder, {
    ratio: "1 / 1"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      marginBottom: "1.5rem"
    }
  }, "Fear is fueling a backlash that could leave students worse off"), /*#__PURE__*/React.createElement("p", null, "Parents and teachers are alarmed. Some districts are pushing screens and AI out of schools entirely. This instinct is understandable, but both extremes carry real costs. Letting AI take over the classroom would stunt student learning and hollow out the relationships it depends on. Yet pushing AI out altogether leaves students unprepared for a world that already runs on it."))))), /*#__PURE__*/React.createElement("section", {
    className: "scheme-3 section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      columnGap: "5rem",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      marginBottom: "1.5rem"
    }
  }, "We're on a mission to bridge this gap."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--text-medium)",
      marginBottom: "2rem"
    }
  }, "The gap exists because frontier AI and classroom learning operate on different timelines and constraints. Our work closes that gap by creating the infrastructure that lets them work together\u2014safely, effectively, and in service of what students actually need to learn."), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: "none",
      margin: "0 0 2rem",
      padding: 0,
      display: "grid",
      gap: "0.75rem"
    }
  }, ["Research what students need", "Test what AI can do", "Build the bridge between them"].map(t => /*#__PURE__*/React.createElement("li", {
    key: t,
    style: {
      display: "flex",
      alignItems: "center",
      gap: "0.75rem"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 24
  }), /*#__PURE__*/React.createElement("span", null, t)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: "1rem"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "alternate",
    onClick: () => go("involved")
  }, "Follow Our Research"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary-alt",
    onClick: () => go("approach")
  }, "Explore Our Approach"))), /*#__PURE__*/React.createElement(Placeholder, {
    ratio: "3 / 2"
  })))));
}
const PRODUCES = [["Research", "Every co-design cycle generates evidence about what AI should do in education, when it works, and why. We openly share our research findings, evaluation methods, and models for teaching and learning alongside AI, so the field can build from evidence instead of assumptions."], ["Capabilities", "Behind every successful classroom tool are foundational capabilities that make it possible. We develop and share reusable capabilities, from specially trained models and datasets to ways of representing what's being taught and learned in a classroom, that any educational AI application can build on."], ["Applications", "Research and capabilities only matter if they improve learning. We build and validate classroom tools and teaching methods alongside educators and students to demonstrate what works in practice."]];
const STEPS = [["We begin by asking what role classrooms need AI to play.", "We start by asking, not what AI can do, but what teachers and students need. At the start of each co-design cycle, our teacher and research partners define a role AI can play to meet a real classroom need, such as enhancing a teacher's understanding of her students' prior experiences and interests, assessing complex skills, or facilitating feedback. That role becomes the North Star for everything that follows."], ["We research what makes that role technically feasible.", "Our educators, researchers, and engineers then build the underlying infrastructure: the reusable technical capabilities a tool needs to play its chosen role well. For the roles we're currently exploring, that includes validated ways for AI to measure and support durable skills and a living map of how the ideas in a particular teacher's class connect to each other and to students' prior experiences and interests. Most of these capabilities don't exist yet. Once we build and prove them, they can be reused, adapted, and made available to others to build on."], ["We build tools that bring the role to life.", "Our interdisciplinary teams—teachers, researchers, engineers, and designers working as true partners—use that infrastructure to build and test AI-powered tools, and new ways of teaching alongside them. This second part is crucial: an AI tool might help students evaluate sources or collaboratively solve problems, but it's only truly effective when paired with a teaching approach that combines what AI and human teachers each do best."]];
function ApproachPage({
  go
}) {
  const {
    Button
  } = ds();
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("section", {
    className: "scheme-1 section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: {
      maxWidth: "var(--container-lg)"
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      marginBottom: "1.5rem"
    }
  }, "Our Approach"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--text-medium)",
      marginBottom: "1.5rem"
    }
  }, "We believe better educational AI will emerge from discovering what classrooms actually need, building solutions with real educators and students, and testing them in real classrooms. What we learn from that testing flows back into better capabilities and tools. That's why every AugmentED project combines research and development in an iterative co-design cycle."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--text-medium)"
    }
  }, "Education technology companies build the applications teachers and students use every day. The large AI labs build the underlying models. What's missing is the layer in between\u2014the capabilities that let AI understand what a student knows, measure skills as complex as critical thinking, and adapt to what's happening in a real classroom. That's the layer we are building."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "2rem"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    onClick: () => go("involved")
  }, "Follow our work")))), /*#__PURE__*/React.createElement("section", {
    className: "scheme-1 section",
    style: {
      paddingTop: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: {
      display: "grid",
      gap: "7rem"
    }
  }, STEPS.map(([h, p], i) => /*#__PURE__*/React.createElement("div", {
    key: h,
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      columnGap: "5rem",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      order: i % 2 === 1 ? 2 : 1
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      marginBottom: "1.5rem"
    }
  }, h), /*#__PURE__*/React.createElement("p", null, p)), /*#__PURE__*/React.createElement("div", {
    style: {
      order: i % 2 === 1 ? 1 : 2
    }
  }, /*#__PURE__*/React.createElement(Placeholder, {
    ratio: "1 / 1"
  })))))), /*#__PURE__*/React.createElement("section", {
    className: "scheme-1 section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: "5rem",
      maxWidth: "var(--container-lg)"
    }
  }, /*#__PURE__*/React.createElement("h2", null, "Through this process, we produce three things the field needs:")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      columnGap: "3rem"
    }
  }, PRODUCES.map(([h, p]) => /*#__PURE__*/React.createElement("div", {
    key: h
  }, /*#__PURE__*/React.createElement(Placeholder, {
    ratio: "3 / 2",
    style: {
      marginBottom: "2rem"
    }
  }), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: "var(--text-h4)",
      marginBottom: "1rem"
    }
  }, h), /*#__PURE__*/React.createElement("p", null, p)))))), /*#__PURE__*/React.createElement("section", {
    className: "scheme-2 section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      columnGap: "5rem",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "eyebrow"
  }, "The Feedback Loop"), /*#__PURE__*/React.createElement("h2", {
    style: {
      marginBottom: "1.5rem"
    }
  }, "What we learn shapes what we build next."), /*#__PURE__*/React.createElement("p", {
    style: {
      marginBottom: "1.5rem"
    }
  }, "Every application is tested in real classrooms alongside educators and students. What we learn tells us which capabilities to build or improve next, while new and improved capabilities make better applications possible. Together, they form a continuous research and development cycle."), /*#__PURE__*/React.createElement("p", null, "Each iteration of the cycle strengthens the field's understanding of what roles AI should play, what capabilities those roles require, and how those ideas translate into practical tools that genuinely improve learning."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "2rem",
      display: "flex",
      gap: "1rem"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "alternate",
    onClick: () => go("involved")
  }, "Follow our work"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary-alt",
    onClick: () => go("team")
  }, "Meet the team"))), /*#__PURE__*/React.createElement(Placeholder, {
    ratio: "3 / 2"
  }))));
}
const LEADERSHIP = [["Sherry Lachman", "Executive director"], ["Caitlin Mills", "Research lead"], ["Raquel Romano", "Engineering lead"], ["Jenny Bradbury", "Partnerships director"]];
const PARTNERS = [["Sherry Lachman", "Executive director"], ["Caitlin Mills", "Research lead"], ["Raquel Romano", "Engineering lead"], ["Jenny Bradbury", "Partnerships director"], ["Brandon Bodnar", "Product designer"], ["Additional team", "Research assistants"], ["Technical staff", "Backend engineers"], ["Operations", "Operations manager"]];
function PersonGrid({
  people,
  columns = 4
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      alignItems: "start",
      columnGap: "2rem",
      rowGap: "3rem"
    }
  }, people.map(([name, title], i) => /*#__PURE__*/React.createElement("div", {
    key: name + i,
    style: {
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement(Placeholder, {
    ratio: "1 / 1",
    style: {
      marginBottom: "1.5rem"
    }
  }), /*#__PURE__*/React.createElement("h5", {
    style: {
      fontSize: "var(--text-large)",
      fontWeight: "var(--font-weight-semibold)"
    }
  }, name), /*#__PURE__*/React.createElement("h6", {
    style: {
      fontSize: "var(--text-medium)",
      fontWeight: "var(--font-weight-regular)"
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "1rem",
      display: "flex",
      gap: "0.875rem"
    }
  }, ["linkedin", "x", "youtube"].map(s => /*#__PURE__*/React.createElement("a", {
    key: s,
    href: "#",
    onClick: e => e.preventDefault()
  }, /*#__PURE__*/React.createElement("img", {
    src: `https://unpkg.com/simple-icons@11.14.0/icons/${s}.svg`,
    width: "22",
    height: "22",
    alt: s
  })))))));
}
function TeamPage() {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("section", {
    className: "scheme-1 section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: {
      maxWidth: "var(--container-lg)"
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      marginBottom: "1.5rem"
    }
  }, "Our Team"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--text-medium)"
    }
  }, "AugmentED brings together people from classrooms, research labs, and engineering teams who share a conviction that AI should augment human teaching, not replace it. We build the infrastructure that lets teachers and students work alongside frontier AI in ways that deepen their thinking, learning, and relationships rather than short-circuit them."))), /*#__PURE__*/React.createElement("section", {
    className: "scheme-1 section",
    style: {
      paddingTop: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      marginBottom: "3rem"
    }
  }, "Leadership"), /*#__PURE__*/React.createElement(PersonGrid, {
    people: LEADERSHIP
  }))), /*#__PURE__*/React.createElement("section", {
    className: "scheme-1 section",
    style: {
      paddingTop: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      marginBottom: "3rem"
    }
  }, "Research Partners"), /*#__PURE__*/React.createElement(PersonGrid, {
    people: PARTNERS
  }))), /*#__PURE__*/React.createElement("section", {
    className: "scheme-1 section",
    style: {
      paddingTop: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      marginBottom: "1rem"
    }
  }, "Technology Partners"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--text-medium)",
      marginBottom: "3rem"
    }
  }, "People who believe AI amplifies rather than replaces human thinking."), /*#__PURE__*/React.createElement(PersonGrid, {
    people: PARTNERS
  }))));
}
Object.assign(window, {
  ChallengePage,
  ApproachPage,
  TeamPage,
  PersonGrid,
  LEADERSHIP,
  PARTNERS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/InnerPages.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/ResearchPage.jsx
try { (() => {
const PAPERS = [["Can AI Help Measure Critical Thinking?", "Carefully scaffolded language models can measure some critical-thinking subskills in student writing, but they still fall short in important ways.", "capabilities"], ["A method for measuring durable skills", "A standardized, step-by-step process for improving and validating the capacity of AI systems to detect complex skills like critical thinking.", "capabilities"], ["The AI Roles for Education framework", "We define five distinct roles AI can play in the classroom—determining what a tool should do, how to judge whether it works, and what safeguards it needs.", "research"], ["Mapping how concepts connect across a semester", "A living representation of a teacher's course material, so a tool can reason about what is being taught and who is in the room.", "capabilities"], ["What teachers need to trust an AI tool", "Findings from our first co-design cohort on the evidence and safeguards educators ask for before adopting a classroom tool.", "research"]];
const FILTERS = [{
  value: "all",
  label: "All research"
}, {
  value: "research",
  label: "Research"
}, {
  value: "capabilities",
  label: "Capabilities"
}];
function PaperRow({
  paper,
  cols = ".5fr 1fr"
}) {
  const {
    Button,
    Icon
  } = ds();
  const [title, desc] = paper;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: cols,
      columnGap: "2rem",
      rowGap: "1rem"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement(Placeholder, {
    ratio: "1 / 1"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      height: "100%",
      flexDirection: "column",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      marginBottom: "0.5rem"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: "var(--text-h5)"
    }
  }, title)), /*#__PURE__*/React.createElement("p", null, desc), /*#__PURE__*/React.createElement(Button, {
    variant: "link",
    size: "link",
    iconRight: /*#__PURE__*/React.createElement(Icon, {
      name: "chevron_right",
      size: 20
    }),
    style: {
      marginTop: "1.5rem"
    }
  }, "Read more")));
}
function ResearchTeaser({
  go
}) {
  const {
    Button
  } = ds();
  return /*#__PURE__*/React.createElement("section", {
    className: "scheme-1 section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: "5rem",
      display: "grid",
      gridTemplateColumns: "1fr max-content",
      alignItems: "end",
      columnGap: "5rem"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-lg)"
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "eyebrow"
  }, "Our Thinking"), /*#__PURE__*/React.createElement("h2", {
    style: {
      marginBottom: "1rem"
    }
  }, "Recent Research"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "var(--text-medium)"
    }
  }, "We work with university and research partners to study what each role AI plays in a classroom makes possible, where it falls short, and what we can build to move those limits.")), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    onClick: () => go("research")
  }, "View all")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      alignItems: "start",
      gap: "3rem"
    }
  }, PAPERS.slice(0, 3).map(p => /*#__PURE__*/React.createElement(PaperRow, {
    key: p[0],
    paper: p,
    cols: ".75fr 1fr"
  })))));
}
function ResearchPage() {
  const {
    Select
  } = ds();
  const [filter, setFilter] = React.useState("all");
  const shown = PAPERS.filter(p => filter === "all" || p[2] === filter);
  return /*#__PURE__*/React.createElement("section", {
    className: "scheme-1 section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: {
      display: "flex",
      maxWidth: "var(--container-lg)",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: "5rem",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("h1", null, "Our Published Research")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: "2.5rem",
      maxWidth: "12.5rem"
    }
  }, /*#__PURE__*/React.createElement(Select, {
    options: FILTERS,
    value: filter,
    onValueChange: setFilter,
    placeholder: "All research",
    style: {
      minWidth: "12.5rem"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr",
      rowGap: "4rem",
      transition: "opacity var(--transition-fade)"
    }
  }, shown.map(p => /*#__PURE__*/React.createElement(PaperRow, {
    key: p[0],
    paper: p
  })))));
}
Object.assign(window, {
  ResearchTeaser,
  ResearchPage,
  PaperRow,
  PAPERS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/ResearchPage.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.SectionHeading = __ds_scope.SectionHeading;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Label = __ds_scope.Label;

__ds_ns.RadioGroup = __ds_scope.RadioGroup;

__ds_ns.RadioGroupItem = __ds_scope.RadioGroupItem;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.Icon = __ds_scope.Icon;

})();
