import React from 'react';
import { useTranslation } from 'react-i18next';

const ErrorMessage = ({ error }: {error: {endpoint: string, message: string, status?: number}}) => {
  const { t } = useTranslation(['statistics', 'common']);
  
  const endpointInfo = error.status ? `${error.endpoint} (Status: ${error.status})` : error.endpoint;

  return (
    <div className="error-message">
        <strong>{t('apiErrorOn', { endpoint: endpointInfo })}</strong> {error.message}
    </div>
  );
}

export default ErrorMessage;