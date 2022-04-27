import Vue from 'vue'
import 'swagger-ui/dist/swagger-ui.css'
import { proxydi } from '@deip/proxydi';
import App from './App'

Vue.config.productionTip = false


fetch('/env')
  .then((res) => res.json())
  .then(env => {
    proxydi.register('env', env);
    Vue.prototype.$env = env;
    Vue.prototype.$currentUser = {
      username: '',
      privKey: '',
      pubKey: '',
      jwtToken: ''
    };

    new Vue({
      render: h => h(App)
    }).$mount('#app')
  })
