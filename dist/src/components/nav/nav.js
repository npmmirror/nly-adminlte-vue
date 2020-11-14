import Vue from "../../utils/vue";
import { mergeData } from "vue-functional-data-merge";

export const props = {
  tag: {
    type: String,
    default: "ul"
  },
  fill: {
    type: Boolean,
    default: false
  },
  justified: {
    type: Boolean,
    default: false
  },
  align: {
    type: String,
    default: null
  },
  tabs: {
    type: Boolean,
    default: false
  },
  tabsRight: {
    type: Boolean,
    default: false
  },
  pills: {
    type: Boolean,
    default: false
  },
  vertical: {
    type: Boolean,
    default: false
  },
  small: {
    type: Boolean,
    default: false
  },
  cardHeader: {
    type: Boolean,
    default: false
  }
};

const computeJustifyContent = value => {
  value = value === "left" ? "start" : value === "right" ? "end" : value;
  return `justify-content-${value}`;
};

const name = "NlyNav";
export const NlyNav = Vue.extend({
  name: name,
  functional: true,
  props,
  render(h, { props, data, children }) {
    return h(
      props.tag,
      mergeData(data, {
        staticClass: "nav",
        class: {
          "nav-tabs": props.tabs,
          "nav-tabs-right": props.tabsRight,
          "nav-pills": props.pills && !props.tabs,
          "card-header-tabs": !props.vertical && props.cardHeader && props.tabs,
          "card-header-pills":
            !props.vertical && props.cardHeader && props.pills && !props.tabs,
          "flex-column": props.vertical,
          "nav-fill": !props.vertical && props.fill,
          "nav-justified": !props.vertical && props.justified,
          [computeJustifyContent(props.align)]: !props.vertical && props.align,
          small: props.small
        }
      }),
      children
    );
  }
});
