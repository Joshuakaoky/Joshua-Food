import { express, json } from './lib/miniExpress.js';
import { config } from './config/env.js';
import { requestLogger } from './middleware/logger.js';
import { authRoutes } from './routes/authRoutes.js';
import { healthRoutes } from './routes/healthRoutes.js';
import { protectedRoutes } from './routes/protectedRoutes.js';

const app = express();
app.use(json());
app.use(requestLogger);

app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', protectedRoutes);

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${config.port}`);
});
