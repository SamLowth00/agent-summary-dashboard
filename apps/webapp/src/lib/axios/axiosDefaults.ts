import axios from 'axios';

axios.defaults.baseURL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3333';

axios.defaults.headers.Accept = 'application/json';
axios.defaults.headers['Content-Type'] = 'application/json';

axios.defaults.timeout = 10000;
