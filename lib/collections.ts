const raw = process.env.EXPO_PUBLIC_COLLECTION_PREFIX ?? '';
export const collectionPrefix = raw === 'qa_' ? raw : '';
export const CHALLENGES = `${collectionPrefix}challenges`;
export const HELP_REQUESTS = `${collectionPrefix}helpRequests`;
