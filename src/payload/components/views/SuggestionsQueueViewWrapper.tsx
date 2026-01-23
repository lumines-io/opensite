import React from 'react';
import { DefaultTemplate } from '@payloadcms/next/templates';
import type { AdminViewServerProps } from 'payload';
import { SuggestionsQueueView } from './SuggestionsQueueView';

export const SuggestionsQueueViewWrapper: React.FC<AdminViewServerProps> = async (props) => {
  const { initPageResult, params, searchParams } = props;
  const {
    permissions,
    req: { i18n, payload, user },
    visibleEntities,
  } = initPageResult;

  return (
    <DefaultTemplate
      i18n={i18n}
      params={params}
      payload={payload}
      permissions={permissions}
      searchParams={searchParams}
      user={user ?? undefined}
      visibleEntities={visibleEntities}
    >
      <SuggestionsQueueView />
    </DefaultTemplate>
  );
};

export default SuggestionsQueueViewWrapper;
