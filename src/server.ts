import app from './app';
import { PORT } from './utils/constants';
import { startBirthdayMessageScheduler, startRecoverUnsentMessageScheduler } from './utils/scheduler';

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  startBirthdayMessageScheduler();
  startRecoverUnsentMessageScheduler();
});
