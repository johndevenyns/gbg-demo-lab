import { supabase } from "@/integrations/supabase/client";
import { DemoEnvironment, FormStep, INDUSTRY_TEMPLATES, IndustryTemplate, StoredTestData } from "@/types/demo";
import { TablesInsert } from "@/integrations/supabase/types";
import { FormStyleConfig, DEFAULT_FORM_STYLE } from "@/types/formStyle";
import { ResultPageConfig } from "@/components/preview/ResultPage";
import { generateIndustryResultPages } from "@/lib/resultPageDefaults";

// Helper to convert database row to DemoEnvironment
const rowToDemo = (row: any): DemoEnvironment => {
  // Parse storedTestData from its dedicated column
  const storedTestData = row.stored_test_data as StoredTestData | null;
  
  // Parse result page configs from form_style (stored together for now)
  const formStyle = row.form_style as (FormStyleConfig & { 
    successPageConfig?: ResultPageConfig; 
    failurePageConfig?: ResultPageConfig;
  }) | null;
  
  return {
    id: row.id,
    slug: row.slug,
    customerName: row.customer_name,
    industryTemplate: row.industry_template as IndustryTemplate,
    verificationType: row.verification_type,
    returnUrl: row.return_url || '',
    approvedUrl: row.approved_url || '',
    rejectedUrl: row.rejected_url || '',
    resourceId: row.resource_id || '',
    resourceIdDataOnly: row.resource_id_dataonly || '',
    resourceIdDataBio: row.resource_id_databio || '',
    resourceIdDocBio: row.resource_id_docbio || '',
    referenceIdPrefix: row.reference_id_prefix || '',
    logoUrl: row.logo_url || '',
    uploadedLogoUrl: row.uploaded_logo_url || '',
    useUploadedLogo: row.use_uploaded_logo ?? false,
    headerBgColor: row.header_bg_color || '#1a1a2e',
    headerTextColor: row.header_text_color || '#ffffff',
    buttonColor: row.button_color || '#6366f1',
    includeQr: row.include_qr ?? true,
    includeAddressVerification: row.include_address_verification ?? false,
    formSteps: (row.form_steps as FormStep[]) || [],
    customerSiteUrl: row.customer_site_url || '',
    scrapedHeaderHtml: row.scraped_header_html || '',
    scrapedFooterHtml: row.scraped_footer_html || '',
    scrapedCss: row.scraped_css || '',
    mirrorActiveMethod: (row.mirror_active_method as 'html' | 'screenshot') || 'html',
    mirrorHtmlHeaderHtml: row.mirror_html_header_html || '',
    mirrorHtmlFooterHtml: row.mirror_html_footer_html || '',
    mirrorHtmlCss: row.mirror_html_css || '',
    mirrorScreenshotHeaderHtml: row.mirror_screenshot_header_html || '',
    mirrorScreenshotFooterHtml: row.mirror_screenshot_footer_html || '',
    mirrorScreenshotCss: row.mirror_screenshot_css || '',
    headerCtaSelector: row.header_cta_selector || '',
    formStyle: formStyle ? { ...DEFAULT_FORM_STYLE, ...formStyle } : DEFAULT_FORM_STYLE,
    successPageConfig: formStyle?.successPageConfig,
    failurePageConfig: formStyle?.failurePageConfig,
    storedTestData: storedTestData || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isActive: row.is_active ?? true,
    createdBy: row.created_by || undefined,
    createdByEmail: row.created_by_email || undefined,
  };
};

// Helper to convert DemoEnvironment to database row for updates
const demoToRow = (demo: Partial<DemoEnvironment>) => {
  const row: Record<string, any> = {};
  if (demo.slug !== undefined) row.slug = demo.slug;
  if (demo.customerName !== undefined) row.customer_name = demo.customerName;
  if (demo.industryTemplate !== undefined) row.industry_template = demo.industryTemplate;
  if (demo.verificationType !== undefined) row.verification_type = demo.verificationType;
  if (demo.returnUrl !== undefined) row.return_url = demo.returnUrl;
  if (demo.approvedUrl !== undefined) row.approved_url = demo.approvedUrl;
  if (demo.rejectedUrl !== undefined) row.rejected_url = demo.rejectedUrl;
  if (demo.resourceId !== undefined) row.resource_id = demo.resourceId;
  if (demo.resourceIdDataOnly !== undefined) row.resource_id_dataonly = demo.resourceIdDataOnly;
  if (demo.resourceIdDataBio !== undefined) row.resource_id_databio = demo.resourceIdDataBio;
  if (demo.resourceIdDocBio !== undefined) row.resource_id_docbio = demo.resourceIdDocBio;
  if (demo.referenceIdPrefix !== undefined) row.reference_id_prefix = demo.referenceIdPrefix;
  if (demo.logoUrl !== undefined) row.logo_url = demo.logoUrl;
  if (demo.uploadedLogoUrl !== undefined) row.uploaded_logo_url = demo.uploadedLogoUrl;
  if (demo.useUploadedLogo !== undefined) row.use_uploaded_logo = demo.useUploadedLogo;
  if (demo.headerBgColor !== undefined) row.header_bg_color = demo.headerBgColor;
  if (demo.headerTextColor !== undefined) row.header_text_color = demo.headerTextColor;
  if (demo.buttonColor !== undefined) row.button_color = demo.buttonColor;
  if (demo.includeQr !== undefined) row.include_qr = demo.includeQr;
  if (demo.includeAddressVerification !== undefined) row.include_address_verification = demo.includeAddressVerification;
  if (demo.formSteps !== undefined) row.form_steps = JSON.parse(JSON.stringify(demo.formSteps));
  if (demo.customerSiteUrl !== undefined) row.customer_site_url = demo.customerSiteUrl;
  if (demo.scrapedHeaderHtml !== undefined) row.scraped_header_html = demo.scrapedHeaderHtml;
  if (demo.scrapedFooterHtml !== undefined) row.scraped_footer_html = demo.scrapedFooterHtml;
  if (demo.scrapedCss !== undefined) row.scraped_css = demo.scrapedCss;
  if (demo.mirrorActiveMethod !== undefined) row.mirror_active_method = demo.mirrorActiveMethod;
  if (demo.mirrorHtmlHeaderHtml !== undefined) row.mirror_html_header_html = demo.mirrorHtmlHeaderHtml;
  if (demo.mirrorHtmlFooterHtml !== undefined) row.mirror_html_footer_html = demo.mirrorHtmlFooterHtml;
  if (demo.mirrorHtmlCss !== undefined) row.mirror_html_css = demo.mirrorHtmlCss;
  if (demo.mirrorScreenshotHeaderHtml !== undefined) row.mirror_screenshot_header_html = demo.mirrorScreenshotHeaderHtml;
  if (demo.mirrorScreenshotFooterHtml !== undefined) row.mirror_screenshot_footer_html = demo.mirrorScreenshotFooterHtml;
  if (demo.mirrorScreenshotCss !== undefined) row.mirror_screenshot_css = demo.mirrorScreenshotCss;
  if (demo.headerCtaSelector !== undefined) row.header_cta_selector = demo.headerCtaSelector;
  // Store result page configs inside form_style to avoid new DB columns
  if (demo.formStyle !== undefined || demo.successPageConfig !== undefined || demo.failurePageConfig !== undefined) {
    const existingStyle = demo.formStyle || {};
    row.form_style = {
      ...existingStyle,
      ...(demo.successPageConfig !== undefined && { successPageConfig: demo.successPageConfig }),
      ...(demo.failurePageConfig !== undefined && { failurePageConfig: demo.failurePageConfig }),
    };
  }
  if (demo.storedTestData !== undefined) row.stored_test_data = demo.storedTestData;
  if (demo.isActive !== undefined) row.is_active = demo.isActive;
  return row;
};

const generateSlug = (name: string) => 
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const demosApi = {
  async getAll(): Promise<DemoEnvironment[]> {
    const { data, error } = await supabase
      .from('demo_environments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(rowToDemo);
  },

  async getById(id: string): Promise<DemoEnvironment | null> {
    const { data, error } = await supabase
      .from('demo_environments')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? rowToDemo(data) : null;
  },

  async getBySlug(slug: string): Promise<DemoEnvironment | null> {
    const { data, error } = await supabase
      .from('demo_environments')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data ? rowToDemo(data) : null;
  },

  async create(customerName: string, template: IndustryTemplate, createdByUserId?: string, createdByEmail?: string): Promise<DemoEnvironment> {
    const templateData = INDUSTRY_TEMPLATES[template];
    const slug = generateSlug(customerName);
    const buttonColor = templateData.buttonColor || '#6366f1';

    // Generate branded default result pages
    const { successPage, failurePage } = generateIndustryResultPages(customerName, template, buttonColor);

    const newDemo: TablesInsert<'demo_environments'> = {
      slug,
      customer_name: customerName,
      industry_template: template,
      verification_type: templateData.verificationType || 'docBio',
      return_url: '',
      approved_url: '',
      rejected_url: '',
      resource_id: '',
      header_bg_color: templateData.headerBgColor || '#1a1a2e',
      header_text_color: templateData.headerTextColor || '#ffffff',
      button_color: buttonColor,
      include_qr: true,
      include_address_verification: templateData.includeAddressVerification || false,
      form_steps: JSON.parse(JSON.stringify(templateData.formSteps || [])),
      form_style: JSON.parse(JSON.stringify({
        ...DEFAULT_FORM_STYLE,
        successPageConfig: successPage,
        failurePageConfig: failurePage,
      })),
      is_active: true,
      created_by: createdByUserId || null,
      created_by_email: createdByEmail || null,
    };

    const { data, error } = await supabase
      .from('demo_environments')
      .insert(newDemo)
      .select()
      .single();

    if (error) throw error;
    return rowToDemo(data);
  },

  async update(id: string, updates: Partial<DemoEnvironment>): Promise<DemoEnvironment> {
    const row = demoToRow(updates);
    
    const { data, error } = await supabase
      .from('demo_environments')
      .update(row)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return rowToDemo(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('demo_environments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
