import Vue from "../../utils/vue";
import getScopId from "../../utils/get-scope-id";
import { isArray, arrayIncludes } from "../../utils/array";
import { getComponentConfig } from "../../utils/config";
import { isString, isUndefinedOrNull } from "../../utils/inspect";
import { HTMLElement, SVGElement } from "../../utils/safe-types";
import { NlyaTooltip } from "./plugin/nlya-tooltip";

const NAME = "NlyTooltip";

// @vue/component
export const NlyTooltip = Vue.extend({
  name: NAME,
  props: {
    title: {
      type: String
      // default: undefined
    },
    // Added in by BPopover
    // content: {
    //   type: String,
    //   default: undefined
    // },
    target: {
      type: [String, HTMLElement, SVGElement, Function, Object],
      required: true
    },
    triggers: {
      type: [String, Array],
      default: "hover focus"
    },
    placement: {
      type: String,
      default: "top"
    },
    fallbackPlacement: {
      type: [String, Array],
      default: "flip",
      validator(value) {
        return (
          (isArray(value) && value.every(v => isString(v))) ||
          arrayIncludes(["flip", "clockwise", "counterclockwise"], value)
        );
      }
    },
    variant: {
      type: String,
      default: () => getComponentConfig(NAME, "variant")
    },
    customClass: {
      type: String,
      default: () => getComponentConfig(NAME, "customClass")
    },
    delay: {
      type: [Number, Object, String],
      default: () => getComponentConfig(NAME, "delay")
    },
    boundary: {
      // String: scrollParent, window, or viewport
      // Element: element reference
      // Object: Vue component
      type: [String, HTMLElement, Object],
      default: () => getComponentConfig(NAME, "boundary")
    },
    boundaryPadding: {
      type: [Number, String],
      default: () => getComponentConfig(NAME, "boundaryPadding")
    },
    offset: {
      type: [Number, String],
      default: 0
    },
    noFade: {
      type: Boolean,
      default: false
    },
    container: {
      // String: HTML ID of container, if null body is used (default)
      // HTMLElement: element reference reference
      // Object: Vue Component
      type: [String, HTMLElement, Object]
      // default: undefined
    },
    show: {
      type: Boolean,
      default: false
    },
    noninteractive: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    },
    id: {
      // ID to use for tooltip element
      // If not provided on will automatically be generated
      type: String,
      default: null
    }
  },
  data() {
    return {
      localShow: this.show,
      localTitle: "",
      localContent: ""
    };
  },
  computed: {
    templateData() {
      // Data that will be passed to the template and popper
      return {
        // We use massaged versions of the title and content props/slots
        title: this.localTitle,
        content: this.localContent,
        // Pass these props as is
        target: this.target,
        triggers: this.triggers,
        placement: this.placement,
        fallbackPlacement: this.fallbackPlacement,
        variant: this.variant,
        customClass: this.customClass,
        container: this.container,
        boundary: this.boundary,
        boundaryPadding: this.boundaryPadding,
        delay: this.delay,
        offset: this.offset,
        noFade: this.noFade,
        interactive: !this.noninteractive,
        disabled: this.disabled,
        id: this.id
      };
    },
    templateTitleContent() {
      // Used to watch for changes to the title and content props
      return {
        title: this.title,
        content: this.content
      };
    }
  },
  watch: {
    show(show, oldVal) {
      if (show !== oldVal && show !== this.localShow && this.$_nly_toolpop) {
        if (show) {
          this.$_nly_toolpop.show();
        } else {
          // We use `forceHide()` to override any active triggers
          this.$_nly_toolpop.forceHide();
        }
      }
    },
    disabled(newVal) {
      if (newVal) {
        this.doDisable();
      } else {
        this.doEnable();
      }
    },
    localShow(newVal) {
      // TODO: May need to be done in a `$nextTick()`
      this.$emit("update:show", newVal);
    },
    templateData() {
      this.$nextTick(() => {
        if (this.$_nly_toolpop) {
          this.$_nly_toolpop.updateData(this.templateData);
        }
      });
    },
    // Watchers for title/content props (prop changes do not trigger the `updated()` hook)
    templateTitleContent() {
      this.$nextTick(this.updateContent);
    }
  },
  created() {
    // Non reactive properties
    this.$_nly_toolpop = null;
  },
  updated() {
    // Update the `propData` object
    // Done in a `$nextTick()` to ensure slot(s) have updated
    this.$nextTick(this.updateContent);
  },
  beforeDestroy() {
    // Shutdown our local event listeners
    this.$off("open", this.doOpen);
    this.$off("close", this.doClose);
    this.$off("disable", this.doDisable);
    this.$off("enable", this.doEnable);
    // Destroy the tip instance
    this.$_nly_toolpop && this.$_nly_toolpop.$destroy();
    this.$_nly_toolpop = null;
  },
  mounted() {
    // Instantiate a new nlyTooltip instance
    // Done in a `$nextTick()` to ensure DOM has completed rendering
    // so that target can be found
    this.$nextTick(() => {
      // Load the on demand child instance
      const Component = this.getComponent();
      // Ensure we have initial content
      this.updateContent();
      // Pass down the scoped style attribute if available
      const scopeId = getScopId(this) || getScopId(this.$parent);
      // Create the instance
      const $toolpop = (this.$_nly_toolpop = new Component({
        parent: this,
        // Pass down the scoped style ID
        _scopeId: scopeId || undefined
      }));
      // Set the initial data
      $toolpop.updateData(this.templateData);
      // Set listeners
      $toolpop.$on("show", this.onShow);
      $toolpop.$on("shown", this.onShown);
      $toolpop.$on("hide", this.onHide);
      $toolpop.$on("hidden", this.onHidden);
      $toolpop.$on("disabled", this.onDisabled);
      $toolpop.$on("enabled", this.onEnabled);
      // Initially disabled?
      if (this.disabled) {
        // Initially disabled
        this.doDisable();
      }
      // Listen to open signals from others
      this.$on("open", this.doOpen);
      // Listen to close signals from others
      this.$on("close", this.doClose);
      // Listen to disable signals from others
      this.$on("disable", this.doDisable);
      // Listen to enable signals from others
      this.$on("enable", this.doEnable);
      // Initially show tooltip?
      if (this.localShow) {
        this.$_nly_toolpop && this.$_nly_toolpop.show();
      }
    });
  },
  methods: {
    getComponent() {
      // Overridden by BPopover
      return NlyaTooltip;
    },
    updateContent() {
      // Overridden by BPopover
      // Tooltip: Default slot is `title`
      // Popover: Default slot is `content`, `title` slot is title
      // We pass a scoped slot function reference by default (Vue v2.6x)
      // And pass the title prop as a fallback
      this.setTitle(this.$scopedSlots.default || this.title);
    },
    // Helper methods for `updateContent()`
    setTitle(val) {
      val = isUndefinedOrNull(val) ? "" : val;
      // We only update the value if it has changed
      if (this.localTitle !== val) {
        this.localTitle = val;
      }
    },
    setContent(val) {
      val = isUndefinedOrNull(val) ? "" : val;
      // We only update the value if it has changed
      if (this.localContent !== val) {
        this.localContent = val;
      }
    },
    // --- Template event handlers ---
    onShow(nlyaEvt) {
      // Placeholder
      this.$emit("show", nlyaEvt);
      if (nlyaEvt) {
        this.localShow = !nlyaEvt.defaultPrevented;
      }
    },
    onShown(nlyaEvt) {
      // Tip is now showing
      this.localShow = true;
      this.$emit("shown", nlyaEvt);
    },
    onHide(nlyaEvt) {
      this.$emit("hide", nlyaEvt);
    },
    onHidden(nlyaEvt) {
      // Tip is no longer showing
      this.$emit("hidden", nlyaEvt);
      this.localShow = false;
    },
    onDisabled(nlyaEvt) {
      // Prevent possible endless loop if user mistakenly
      // fires `disabled` instead of `disable`
      if (nlyaEvt && nlyaEvt.type === "disabled") {
        this.$emit("update:disabled", true);
        this.$emit("disabled", nlyaEvt);
      }
    },
    onEnabled(nlyaEvt) {
      // Prevent possible endless loop if user mistakenly
      // fires `enabled` instead of `enable`
      if (nlyaEvt && nlyaEvt.type === "enabled") {
        this.$emit("update:disabled", false);
        this.$emit("enabled", nlyaEvt);
      }
    },
    // --- Local event listeners ---
    doOpen() {
      !this.localShow && this.$_nly_toolpop && this.$_nly_toolpop.show();
    },
    doClose() {
      this.localShow && this.$_nly_toolpop && this.$_nly_toolpop.hide();
    },
    doDisable() {
      this.$_nly_toolpop && this.$_nly_toolpop.disable();
    },
    doEnable() {
      this.$_nly_toolpop && this.$_nly_toolpop.enable();
    }
  },
  render(h) {
    // Always renders a comment node
    // TODO:
    //   Future: Possibly render a target slot (single root element)
    //   which we can apply the listeners to (pass `this.$el` to nlyTooltip)
    return h();
  }
});
