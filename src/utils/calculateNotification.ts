import moment from 'moment-timezone';

export const calculateNextBirthdayNotification = (birthday: Date, timezone: string): Date => {
  const now = moment().tz(timezone);
  let nextBirthday = moment(birthday).tz(timezone).year(now.year());

  if (now.isAfter(nextBirthday)) {
    nextBirthday.add(1, 'year');
  }

  nextBirthday.hour(9).minute(0).second(0).millisecond(0);

  return nextBirthday.toDate();
};
