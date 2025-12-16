import { TaskFormData, RecurrenceType } from '../components/TaskModal';

export const generateRecurringTasks = (
  originalTask: TaskFormData,
  yearsAhead: number = 3
): TaskFormData[] => {
  if (!originalTask.recurrenceType || originalTask.recurrenceType === 'Нэг удаагийн') {
    return [];
  }

  const generatedTasks: TaskFormData[] = [];
  const startDate = new Date(originalTask.dueDate);
  const currentYear = new Date().getFullYear();
  const endYear = currentYear + yearsAhead;

  const baseTask = {
    ...originalTask,
    status: 'Төлөвлөсөн' as const,
    completed: false,
    isRecurring: false,
    parentTaskId: originalTask.id,
  };

  switch (originalTask.recurrenceType) {
    case '7 хоног бүр': {
      const dayOfWeek = startDate.getDay();
      let currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + 7);

      while (currentDate.getFullYear() <= endYear) {
        generatedTasks.push({
          ...baseTask,
          id: `${originalTask.id}_${currentDate.getTime()}`,
          dueDate: currentDate.toISOString(),
        });
        currentDate.setDate(currentDate.getDate() + 7);
      }
      break;
    }

    case 'Сар бүр': {
      const dayOfMonth = startDate.getDate();
      let currentDate = new Date(startDate);
      currentDate.setMonth(currentDate.getMonth() + 1);

      while (currentDate.getFullYear() <= endYear) {
        const tempDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayOfMonth);
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

        if (dayOfMonth > daysInMonth) {
          tempDate.setDate(daysInMonth);
        }

        generatedTasks.push({
          ...baseTask,
          id: `${originalTask.id}_${tempDate.getTime()}`,
          dueDate: tempDate.toISOString(),
        });

        currentDate.setMonth(currentDate.getMonth() + 1);
      }
      break;
    }

    case 'Улирал бүр': {
      const dayOfMonth = startDate.getDate();
      const monthOfQuarter = startDate.getMonth();
      let currentDate = new Date(startDate);
      currentDate.setMonth(currentDate.getMonth() + 3);

      while (currentDate.getFullYear() <= endYear) {
        const tempDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayOfMonth);
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

        if (dayOfMonth > daysInMonth) {
          tempDate.setDate(daysInMonth);
        }

        generatedTasks.push({
          ...baseTask,
          id: `${originalTask.id}_${tempDate.getTime()}`,
          dueDate: tempDate.toISOString(),
        });

        currentDate.setMonth(currentDate.getMonth() + 3);
      }
      break;
    }

    case 'Жил бүр': {
      const dayOfMonth = startDate.getDate();
      const month = startDate.getMonth();
      let currentYear = startDate.getFullYear() + 1;

      while (currentYear <= endYear) {
        const tempDate = new Date(currentYear, month, dayOfMonth);

        if (month === 1 && dayOfMonth === 29) {
          const isLeapYear = (currentYear % 4 === 0 && currentYear % 100 !== 0) || currentYear % 400 === 0;
          if (!isLeapYear) {
            tempDate.setDate(28);
          }
        }

        generatedTasks.push({
          ...baseTask,
          id: `${originalTask.id}_${tempDate.getTime()}`,
          dueDate: tempDate.toISOString(),
        });

        currentYear++;
      }
      break;
    }
  }

  return generatedTasks;
};

export const getRecurrenceLabel = (recurrenceType: RecurrenceType): string => {
  const labels: Record<RecurrenceType, string> = {
    'Нэг удаагийн': 'Нэг удаа',
    '7 хоног бүр': 'Долоо хоног бүр',
    'Сар бүр': 'Сар бүр',
    'Улирал бүр': 'Улирал бүр',
    'Жил бүр': 'Жил бүр'
  };
  return labels[recurrenceType];
};

export const isTaskGenerated = (task: TaskFormData): boolean => {
  return !!task.parentTaskId;
};

export const shouldRegenerateRecurringTasks = (
  existingTasks: TaskFormData[],
  parentTask: TaskFormData
): boolean => {
  if (!parentTask.id || !parentTask.isRecurring) {
    return false;
  }

  const generatedTasks = existingTasks.filter(t => t.parentTaskId === parentTask.id);

  if (generatedTasks.length === 0) {
    return true;
  }

  const latestGeneratedTask = generatedTasks.reduce((latest, current) => {
    return new Date(current.dueDate) > new Date(latest.dueDate) ? current : latest;
  }, generatedTasks[0]);

  const latestDate = new Date(latestGeneratedTask.dueDate);
  const threeYearsFromNow = new Date();
  threeYearsFromNow.setFullYear(threeYearsFromNow.getFullYear() + 3);

  return latestDate < threeYearsFromNow;
};
