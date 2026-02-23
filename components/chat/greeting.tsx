import { motion } from 'framer-motion';
import { useIntl } from 'react-intl';

export const Greeting = () => {
  const intl = useIntl();
  return (
    <div
      key="overview"
      className="max-w-3xl mx-auto md:mt-20 px-8 size-full flex flex-col justify-center pt-50 bottom-0"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
        className="text-2xl font-semibold"
      >
{intl.formatMessage({ id: 'chat.greeting.hello', defaultMessage: 'Hello there!' })}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
        className="text-2xl text-zinc-500 mt-4"
      >
{intl.formatMessage({ id: 'chat.greeting.help', defaultMessage: 'How can I help you today?' })}
      </motion.div>
    </div>
  );
};
