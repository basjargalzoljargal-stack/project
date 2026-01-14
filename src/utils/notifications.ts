import { supabase } from '../lib/supabase';

export interface CreateNotificationParams {
  userId: string;
  type: 'task_assigned' | 'task_due_soon' | 'task_overdue' |
        'task_completed' | 'chat_mention' | 'chat_message' |
        'proposal_approved' | 'proposal_rejected' | 'proposal_needs_revision' |
        'completion_reviewed' | 'added_to_department' | 'system_announcement';
  title: string;
  message: string;
  actorId?: string;
  actorName?: string;
  link?: string;
  relatedType?: 'task' | 'proposal' | 'completion' | 'chat';
  relatedId?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        actor_id: params.actorId,
        actor_name: params.actorName,
        link: params.link,
        related_type: params.relatedType,
        related_id: params.relatedId,
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

export async function createTaskAssignedNotification(
  userId: string,
  taskTitle: string,
  assignedBy: string,
  taskId: string
) {
  return createNotification({
    userId,
    type: 'task_assigned',
    title: 'Шинэ ажил хуваарилагдлаа',
    message: `"${taskTitle}" ажил танд хуваарилагдлаа`,
    actorName: assignedBy,
    relatedType: 'task',
    relatedId: taskId,
  });
}

export async function createTaskDueSoonNotification(
  userId: string,
  taskTitle: string,
  dueDate: string,
  taskId: string
) {
  return createNotification({
    userId,
    type: 'task_due_soon',
    title: 'Хугацаа ойртож байна',
    message: `"${taskTitle}" ажлын хугацаа дуусахад ${dueDate} үлдлээ`,
    relatedType: 'task',
    relatedId: taskId,
  });
}

export async function createTaskOverdueNotification(
  userId: string,
  taskTitle: string,
  taskId: string
) {
  return createNotification({
    userId,
    type: 'task_overdue',
    title: 'Хугацаа хэтэрсэн',
    message: `"${taskTitle}" ажлын хугацаа өнгөрсөн байна`,
    relatedType: 'task',
    relatedId: taskId,
  });
}

export async function createProposalApprovedNotification(
  userId: string,
  proposalTitle: string,
  approvedBy: string,
  proposalId: string
) {
  return createNotification({
    userId,
    type: 'proposal_approved',
    title: 'Төсөл санал батлагдсан',
    message: `"${proposalTitle}" санал таны батлагдлаа`,
    actorName: approvedBy,
    relatedType: 'proposal',
    relatedId: proposalId,
  });
}

export async function createProposalRejectedNotification(
  userId: string,
  proposalTitle: string,
  rejectedBy: string,
  reason: string,
  proposalId: string
) {
  return createNotification({
    userId,
    type: 'proposal_rejected',
    title: 'Төсөл санал татгалзагдсан',
    message: `"${proposalTitle}" санал татгалзагдсан. Шалтгаан: ${reason}`,
    actorName: rejectedBy,
    relatedType: 'proposal',
    relatedId: proposalId,
  });
}

export async function createChatMentionNotification(
  userId: string,
  mentionedBy: string,
  chatName: string,
  messagePreview: string,
  chatId: string
) {
  return createNotification({
    userId,
    type: 'chat_mention',
    title: `@${mentionedBy} танийг дурджээ`,
    message: `${chatName} чат дээр: ${messagePreview}`,
    actorName: mentionedBy,
    relatedType: 'chat',
    relatedId: chatId,
  });
}

export async function createCompletionReviewedNotification(
  userId: string,
  taskTitle: string,
  reviewedBy: string,
  approved: boolean,
  taskId: string
) {
  return createNotification({
    userId,
    type: 'completion_reviewed',
    title: approved ? 'Биелэлт батлагдсан' : 'Биелэлт буцаагдсан',
    message: `Таны "${taskTitle}" ажлын биелэлтийг ${reviewedBy} ${approved ? 'баталгаажууллаа' : 'буцаалаа'}`,
    actorName: reviewedBy,
    relatedType: 'task',
    relatedId: taskId,
  });
}

export async function createAddedToDepartmentNotification(
  userId: string,
  departmentName: string,
  addedBy: string,
  departmentId: string
) {
  return createNotification({
    userId,
    type: 'added_to_department',
    title: 'Хэлтэст нэмэгдсэн',
    message: `Та "${departmentName}" хэлтэст нэмэгдлээ`,
    actorName: addedBy,
  });
}

export async function createSystemAnnouncementNotification(
  userId: string,
  title: string,
  message: string
) {
  return createNotification({
    userId,
    type: 'system_announcement',
    title,
    message,
  });
}

export async function createSampleNotifications(userId: string) {
  const notifications = [
    {
      type: 'task_assigned' as const,
      title: 'Шинэ ажил хуваарилагдлаа',
      message: '"Хүргэлтийн төлөвлөгөө баталгаажуулах" ажил танд хуваарилагдлаа',
      actor_name: 'Admin',
      created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    },
    {
      type: 'chat_mention' as const,
      title: '@UserA танийг дурджээ',
      message: 'Хэлтэс 1 чат дээр: Энэ баримтыг шалгаарай',
      actor_name: 'UserA',
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    {
      type: 'completion_reviewed' as const,
      title: 'Биелэлт батлагдсан',
      message: 'Таны "Тайлан бэлтгэх" ажлын биелэлтийг Admin баталгаажууллаа',
      actor_name: 'Admin',
      created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    },
    {
      type: 'proposal_rejected' as const,
      title: 'Төсөл санал татгалзагдсан',
      message: '"Шинэ систем" санал нь шаардлага хангахгүй байна. Шалтгаан: Төсөв хэтэрсэн',
      actor_name: 'Manager',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000 - 5.5 * 60 * 60 * 1000).toISOString(),
    },
    {
      type: 'task_due_soon' as const,
      title: 'Хугацаа ойртож байна',
      message: '"Сарын тайлан" ажлын хугацаа дуусахад 8 цаг үлдлээ',
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      type: 'proposal_approved' as const,
      title: 'Төсөл санал батлагдсан',
      message: '"Цахим архив систем" санал таны батлагдлаа',
      actor_name: 'Director',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      type: 'added_to_department' as const,
      title: 'Хэлтэст нэмэгдсэн',
      message: 'Та "IT хэлтэс" хэлтэст нэмэгдлээ',
      actor_name: 'HR Manager',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      type: 'task_overdue' as const,
      title: 'Хугацаа хэтэрсэн',
      message: '"Баримт баталгаажуулах" ажлын хугацаа өнгөрсөн байна',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      type: 'system_announcement' as const,
      title: 'Системийн шинэчлэлт',
      message: 'Систем маргааш 22:00-23:00 цагт шинэчлэгдэх тул түр хаагдах болно',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      type: 'chat_message' as const,
      title: 'Шинэ чат мессеж',
      message: 'Санхүү хэлтэс чат: Өнөөдрийн хурал цуцлагдлаа',
      actor_name: 'Finance Team',
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  for (const notif of notifications) {
    try {
      await supabase.from('notifications').insert({
        user_id: userId,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        actor_name: notif.actor_name,
        is_read: Math.random() > 0.6,
        created_at: notif.created_at,
      });
    } catch (error) {
      console.error('Error creating sample notification:', error);
    }
  }
}
