import type { Element, Nodes } from 'hast'
import { defaultSchema } from 'rehype-sanitize'

// Inline SVG for rehype-sanitize: drawing, filters and SMIL animation; no script/style/foreignObject/feImage.
const svgTagNames = [
  'svg', 'g', 'defs', 'symbol', 'use', 'switch', 'title', 'desc',
  'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'image',
  'text', 'tspan', 'textPath',
  'linearGradient', 'radialGradient', 'stop', 'pattern', 'clipPath', 'mask', 'marker',
  'filter', 'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite', 'feConvolveMatrix',
  'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight', 'feDropShadow', 'feFlood',
  'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'feGaussianBlur', 'feMerge', 'feMergeNode',
  'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile', 'feTurbulence',
  'animate', 'animateMotion', 'animateTransform', 'set', 'mpath',
]

// `href`/`xlink:href` are protocol-checked by the schema (http(s) or same-document `#id`).
const hrefTagNames = ['use', 'image', 'textPath', 'mpath']

// hast property names (camelCase)
const svgAttributes = [
  'id', 'className', 'role', 'ariaLabel', 'ariaHidden', 'ariaLabelledBy', 'ariaDescribedBy',
  'viewBox', 'preserveAspectRatio', 'width', 'height', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
  'cx', 'cy', 'r', 'rx', 'ry', 'fx', 'fy', 'fr', 'd', 'points', 'pathLength', 'transform',
  'fill', 'fillOpacity', 'fillRule', 'stroke', 'strokeWidth', 'strokeLineCap', 'strokeLineJoin',
  'strokeDashArray', 'strokeDashOffset', 'strokeOpacity', 'strokeMiterLimit', 'opacity', 'color',
  'display', 'visibility', 'overflow', 'vectorEffect', 'paintOrder', 'shapeRendering',
  'offset', 'stopColor', 'stopOpacity', 'gradientUnits', 'gradientTransform', 'spreadMethod',
  'patternUnits', 'patternContentUnits', 'patternTransform',
  'clipPath', 'clipRule', 'clipPathUnits', 'mask', 'maskUnits', 'maskContentUnits',
  'markerStart', 'markerMid', 'markerEnd', 'markerWidth', 'markerHeight', 'markerUnits', 'refX', 'refY', 'orient',
  'fontSize', 'fontFamily', 'fontWeight', 'fontStyle', 'textAnchor', 'dominantBaseline', 'letterSpacing',
  'dx', 'dy', 'rotate', 'textLength', 'lengthAdjust', 'startOffset',
  'filter', 'filterUnits', 'primitiveUnits', 'stdDeviation', 'in', 'in2', 'result', 'mode', 'type',
  'values', 'operator', 'k1', 'k2', 'k3', 'k4', 'floodColor', 'floodOpacity',
  'baseFrequency', 'numOctaves', 'seed', 'stitchTiles', 'scale', 'xChannelSelector', 'yChannelSelector',
  'radius', 'tableValues', 'slope', 'intercept', 'amplitude', 'exponent', 'order', 'kernelMatrix',
  'divisor', 'bias', 'targetX', 'targetY', 'edgeMode', 'preserveAlpha', 'surfaceScale', 'diffuseConstant',
  'specularConstant', 'specularExponent', 'kernelUnitLength', 'lightingColor', 'azimuth', 'elevation',
  'z', 'pointsAtX', 'pointsAtY', 'pointsAtZ', 'limitingConeAngle',
  'attributeName', 'attributeType', 'from', 'to', 'by', 'dur', 'begin', 'end', 'min', 'max',
  'repeatCount', 'repeatDur', 'restart', 'calcMode', 'keyTimes', 'keySplines', 'keyPoints',
  'additive', 'accumulate', 'path', 'systemLanguage',
]

export const svgSchema = {
  tagNames: svgTagNames,
  attributes: {
    ...Object.fromEntries(svgTagNames.map((t) => [t, svgAttributes])),
    ...Object.fromEntries(hrefTagNames.map((t) => [t, [...svgAttributes, 'href', 'xLinkHref']])),
  },
  protocols: { xLinkHref: defaultSchema.protocols?.href ?? [] },
}

const prefix = defaultSchema.clobberPrefix ?? ''
const urlRef = /url\(\s*(['"]?)#([^'")\s]+)\1\s*\)/g

/** Sanitizing prefixes every `id`; point `url(#id)` and `href="#id"` inside SVG at the prefixed ids. */
// SMIL `begin="other.end"` style timing refs are not rewritten.
export function rehypeSvgRefs() {
  return (tree: Nodes) => {
    const walk = (node: Nodes, inSvg: boolean) => {
      if (node.type === 'element') {
        inSvg ||= node.tagName === 'svg'
        if (inSvg) fixRefs(node)
      }
      if ('children' in node) for (const child of node.children) walk(child, inSvg)
    }
    walk(tree, false)
  }
}

function fixRefs(node: Element) {
  const props = node.properties
  for (const key in props) {
    const value = props[key]
    if (typeof value !== 'string') continue
    if (key === 'href' || key === 'xLinkHref') {
      if (value.startsWith('#')) props[key] = `#${prefix}${value.slice(1)}`
    } else if (value.includes('url(')) {
      props[key] = value.replace(urlRef, (_, q, id) => `url(${q}#${prefix}${id}${q})`)
    }
  }
}
