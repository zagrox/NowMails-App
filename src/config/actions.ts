// This file serves as the single source of truth for all permissionable actions in the application.
// Each action string corresponds to a feature that can be locked. To lock a feature, add its
// corresponding action string as a tag to the `locked_actions` field of a module in Directus.

export const AppActions = {
  // --- For "Marketing" Module ---
  START_MARKETING_CAMPAIGN: 'start_marketing_campaign', // Controls "Create Campaign" button on Dashboard
  SEND_MARKETING_CAMPAIGN: 'send_marketing_campaign',   // Controls final "Send/Schedule" in wizard
  SAVE_MARKETING_DRAFT: 'save_marketing_draft',       // Controls final "Save Draft" in wizard

  // --- For "Send Email" Module ---
  SEND_TRANSACTIONAL_EMAIL: 'send_transactional_email', // Controls "Send Now" on simple send page
  SAVE_TRANSACTIONAL_DRAFT: 'save_transactional_draft', // Controls "Save Draft" on simple send page

  // --- For "Campaigns" Module ---
  CREATE_CAMPAIGN: 'create_campaign',                   // Controls "Create Campaign" button in Campaigns view

  // --- For "Contacts" Module ---
  IMPORT_CONTACTS: 'import_contacts',
  EXPORT_CONTACTS: 'export_contacts',
  ADD_CONTACT: 'add_contact',

  // --- For "Email Lists" Module ---
  CREATE_LIST: 'create_list',

  // --- For "Segments" Module ---
  CREATE_SEGMENT: 'create_segment',

  // --- For "Domains" Module ---
  ADD_DOMAIN: 'add_domain',

  // --- For "SMTP" Module ---
  ADD_SMTP_CREDENTIAL: 'add_smtp_credential',
  REVEAL_SMTP_ACCESS: 'reveal_access',

  // --- For "Media Manager" Module ---
  UPLOAD_FILE: 'upload_file',

  // --- For "Templates" & "Email Builder" Modules ---
  CREATE_TEMPLATE: 'create_template',
  SAVE_TEMPLATE: 'save_template',
  
  // --- For "API" Module ---
  REVEAL_API_KEY: 'Reveal_Key',
  GENERATE_API_KEY: 'Generate_Key',

  // --- A general-purpose action for wizard navigation, typically not locked ---
  WIZARD_NEXT_STEP: 'wizard_next_step'
};