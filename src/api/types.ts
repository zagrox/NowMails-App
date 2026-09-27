export type Contact = {
    Email: string;
    FirstName: string;
    LastName: string;
    Status: 'Active' | 'Transactional' | 'Engaged' | 'Inactive' | 'Abuse' | 'Bounced' | 'Unsubscribed' | 'Stale' | 'NotConfirmed';
    Source: string;
    SourceInfo?: string;
    DateAdded: string;
    DateUpdated?: string;
    StatusChangeDate?: string;
    Consent?: {
        ConsentIP?: string;
        ConsentDate?: string;
        ConsentTracking?: string;
    };
    Activity?: {
        TotalSent?: number;
        TotalOpened?: number;
        TotalClicked?: number;
        TotalFailed?: number;
        LastSent?: string;
        LastOpened?: string;
        LastClicked?: string;
        LastFailed?: string;
        LastIP?: string;
        ErrorCode?: number;
        FriendlyErrorMessage?: string;
    };
    CustomFields?: Record<string, any>;
};
export type List = {
    ListName: string;
    DateAdded: string;
    ContactsCount: number;
    AllowUnsubscribe: boolean;
};
export type Segment = {
    Name: string;
    Rule: string;
    ContactsCount: number;
    DateAdded: string;
};
export type FileInfo = {
    FileName: string;
    Size: number;
    DateAdded: string;
    ExpiresAfterDays?: number;
};
export type Template = {
    Name: string;
    DateAdded: string;
    Subject?: string;
    Body: { Content: string }[];
};
export type PublicTemplate = {
    id: number;
    status: string;
    template_name: string;
    template_type: string[];
    template_html: string; // This is a file ID
    template_image: string | null; // This is a file ID
    template_language?: string;
    template_color?: string;
};
export type Module = {
    id: string;
    modulename: string;
    moduleprice: number;
    moduledetails: string;
    status: string;
    modulepro?: boolean;
    modulediscount?: number;
    modulecore?: boolean;
    locked_actions?: string[];
};
export type Configuration = {
    id: number;
    app_phone: string;
    app_support: string;
    app_copyright: string;
    app_secondary_color: string;
    app_secondary_color_dark: string;
    app_native: string;
    app_name: string;
    app_logo: string;
    app_zibal: string;
    app_site: string;
    app_url: string;
    app_icon: string;
    app_banner: string;
    app_backend: string;
    app_language: string;
    app_recaptcha?: boolean;
    app_recaptcha_key?: string;
    user_registration_role?: string;
    app_bank_name?: string;
    app_card_number?: string;
    app_account_name?: string;
    app_chat?: string;
    app_version?: string;
};
export type CustomField = {
    Name: string;
    DataType: 'String' | 'Number' | 'Date' | 'Boolean';
    DateAdded?: string;
};