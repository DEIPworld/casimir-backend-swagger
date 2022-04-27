<template>
  <div id="app">
    <section class="swagger-ui swagger-container">
      <div class="topbar">
        <div class="wrapper">
          <div class="topbar-wrapper">
            <a rel="noopener noreferrer" class="link">
              <img height="40" src="/assets/landing-logo.svg" alt="Swagger UI" />
            </a>
            <div class="download-url-wrapper">
              <input
                class="download-url-input"
                type="text"
                v-model="specUrl"
              />
              <button @click="changeServerUrl(); renderSwaggerUi()" class="download-url-button button">Explore</button>
            </div>
          </div>
        </div>
      </div>
      <div id="swagger-ui"></div>
    </section>
  </div>
</template>

<script>
  import SwaggerUI from 'swagger-ui';
  import { proxydi } from '@deip/proxydi';
  import { interceptorsMethodsMixin } from './mixins'

  export default {
    name: 'App',
    data() {
      return {
        // specUrl: `${proxydi.get('env').DEIP_SERVER_URL}/swagger/v2/swagger`
        specUrl: 'http://127.0.0.1:9081/swagger/v2/swagger'
      }
    },
    mixins: [interceptorsMethodsMixin],
    methods: {
      changeServerUrl() {
        const oldEnv = proxydi.get('env');
        proxydi.register('env', {
          ...oldEnv,
          DEIP_SERVER_URL: new URL(this.specUrl).origin
        });
      },
      renderSwaggerUi() {
        SwaggerUI({
          url: this.specUrl,
          dom_id: '#swagger-ui',
          requestInterceptor: async (request) => {
            const newRequest = await this.wrapRequest(request);
            return newRequest;
          },
          responseInterceptor: async (response) => {
            const newResponse = await this.parseResponse(response);
            return newResponse;
          },
          presets: [
            SwaggerUI.presets.apis
          ],
          plugins: [
            SwaggerUI.plugins.DownloadUrl
          ]
        })
      }
    },
    mounted() {
      this.renderSwaggerUi()
    },
  };
</script>
