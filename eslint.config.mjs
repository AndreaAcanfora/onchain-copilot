import next from 'eslint-config-next';

const config = [...next, { ignores: ['.next/**', 'test-results/**', 'playwright-report/**'] }];

export default config;
