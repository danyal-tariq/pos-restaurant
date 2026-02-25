/// <reference types="vite/client" />
/// <reference types="react/jsx-runtime" />

// Re-export JSX namespace globally for compatibility
import type * as ReactJSXRuntime from 'react/jsx-runtime'
declare global {
  namespace JSX {
    type Element = ReactJSXRuntime.JSX.Element
    type ElementType = ReactJSXRuntime.JSX.ElementType
    type IntrinsicElements = ReactJSXRuntime.JSX.IntrinsicElements
    type IntrinsicAttributes = ReactJSXRuntime.JSX.IntrinsicAttributes
  }
}
