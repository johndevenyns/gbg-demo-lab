 import { FormStyleConfig, DEFAULT_FORM_STYLE } from '@/types/formStyle';
 
 /**
  * Shared utility functions for form styling.
  * Used across all preview contexts: FormStyleCard, ScreenshotCaptureTab, HtmlCaptureTab, DemoFlowRenderer
  */
 
 // ============ Style Value Mappers ============
 
 export function getBorderRadius(radius: string = 'md'): string {
   switch (radius) {
     case 'none': return '0px';
     case 'sm': return '4px';
     case 'lg': return '12px';
     case 'full': return '9999px';
     default: return '8px';
   }
 }
 
 export function getPadding(padding: string = 'md'): string {
   switch (padding) {
     case 'sm': return '8px 12px';
     case 'lg': return '14px 18px';
     default: return '10px 14px';
   }
 }
 
 export function getFontSize(size: string = 'base'): string {
   switch (size) {
     case 'sm': return '14px';
     case 'lg': return '18px';
     default: return '16px';
   }
 }
 
 export function getLabelWeight(weight: string = 'medium'): number {
   switch (weight) {
     case 'semibold': return 600;
     case 'medium': return 500;
     default: return 400;
   }
 }
 
 export function getFieldSpacing(spacing: string = 'normal'): string {
   switch (spacing) {
     case 'compact': return '12px';
     case 'relaxed': return '24px';
     default: return '16px';
   }
 }
 
 // ============ Style Object Generators ============
 
 export interface FormInputStyles {
   container: string;
   title: string;
   label: string;
   input: string;
   button: string;
   errorText: string;
 }
 
 /**
  * Generates inline CSS style strings for form elements.
  * Used for iframe srcDoc HTML generation.
  */
 export function getFormInlineStyles(formStyle: FormStyleConfig, buttonColor: string): FormInputStyles {
   const borderRadius = getBorderRadius(formStyle.borderRadius);
   const padding = getPadding(formStyle.inputPadding);
   const fontSize = getFontSize(formStyle.fontSize);
   const labelWeight = getLabelWeight(formStyle.labelWeight);
  const formBgColor = formStyle.formBgColor || '#ffffff';
 
   return {
    container: `max-width: 480px; margin: 0 auto; background: ${formBgColor}; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 32px; border: 1px solid #e5e7eb;`,
     title: `margin: 0 0 24px 0; font-size: 20px; font-weight: 600; color: ${formStyle.labelColor}; font-family: ${formStyle.fontFamily}; text-align: center;`,
     label: `display: block; margin-bottom: 6px; font-weight: ${labelWeight}; color: ${formStyle.labelColor}; font-family: ${formStyle.fontFamily}; font-size: ${fontSize};`,
     input: `width: 100%; padding: ${padding}; border: ${formStyle.borderWidth}px solid ${formStyle.inputBorderColor}; border-radius: ${borderRadius}; background: ${formStyle.inputBgColor}; color: ${formStyle.inputTextColor}; font-family: ${formStyle.fontFamily}; font-size: ${fontSize}; box-sizing: border-box; outline: none;`,
     button: `width: 100%; padding: 12px 24px; background: ${buttonColor}; color: white; border: none; border-radius: ${borderRadius}; font-size: ${fontSize}; font-weight: 600; cursor: pointer; font-family: ${formStyle.fontFamily};`,
     errorText: `color: ${formStyle.errorColor}; margin-left: 4px;`,
   };
 }
 
 /**
  * Generates the complete form HTML for use in iframe srcDoc.
  * This is the SINGLE SOURCE OF TRUTH for all preview contexts.
  * 
  * NOTE: This generates a mock form for preview purposes matching the
  * FormStyleCard live preview (First Name, Last Name, Email + focus state).
  */
 export function generateFormHtml(formStyle: FormStyleConfig, buttonColor: string): string {
   const styles = getFormInlineStyles(formStyle, buttonColor);
   
   return `
     <div style="${styles.container}">
       <h2 style="${styles.title}">Application Form</h2>
       <div style="margin-bottom: 16px;">
         <label style="${styles.label}">First Name<span style="${styles.errorText}">*</span></label>
         <input type="text" placeholder="John" style="${styles.input}" />
       </div>
       <div style="margin-bottom: 16px;">
         <label style="${styles.label}">Last Name<span style="${styles.errorText}">*</span></label>
         <input type="text" placeholder="Doe" style="${styles.input}" />
       </div>
       <div style="margin-bottom: 16px;">
         <label style="${styles.label}">Email<span style="${styles.errorText}">*</span></label>
         <input type="email" placeholder="john@example.com" style="${styles.input}" />
       </div>
       <button style="${styles.button}">Continue</button>
     </div>
   `.trim();
 }
 
 /**
  * Generates a complete HTML document for iframe preview.
  * Includes optional header/footer content and CSS.
  */
 export interface PreviewDocumentOptions {
   formStyle: FormStyleConfig;
   buttonColor: string;
   headerHtml?: string;
   footerHtml?: string;
   cssContent?: string;
   contentBgColor?: string;
 }
 
 export function generatePreviewDocument(options: PreviewDocumentOptions): string {
  const { formStyle, buttonColor, headerHtml, footerHtml, cssContent, contentBgColor } = options;
   const formHtml = generateFormHtml(formStyle, buttonColor);
  const bgColor = contentBgColor || formStyle.contentAreaBgColor || '#f5f5f5';
 
   return `
     <!DOCTYPE html>
     <html>
       <head>
         <meta charset="utf-8">
         <style>
           body { margin: 0; padding: 0; font-family: ${formStyle.fontFamily}; }
           * { box-sizing: border-box; }
         </style>
         ${cssContent ? `<style>${cssContent}</style>` : ''}
       </head>
       <body>
         ${headerHtml || ''}
        <div style="padding: 40px 20px; background: ${bgColor}; min-height: 150px;">
           ${formHtml}
         </div>
         ${footerHtml || ''}
       </body>
     </html>
   `.trim();
 }