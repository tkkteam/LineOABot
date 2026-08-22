import User from './User.js';
import Group from './Group.js';
import Participant from './Participant.js';
import Winner from './Winner.js';
import Event from './Event.js';
import Setting from './Setting.js';

// ---------- Associations (ER relationships) ----------

// Group 1 --- N Participant
Group.hasMany(Participant, { foreignKey: 'group_id', as: 'participants', onDelete: 'CASCADE' });
Participant.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });

// Group 1 --- N Winner
Group.hasMany(Winner, { foreignKey: 'group_id', as: 'winners', onDelete: 'CASCADE' });
Winner.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });

// Group 1 --- N Event
Group.hasMany(Event, { foreignKey: 'group_id', as: 'events', onDelete: 'CASCADE' });
Event.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });

export { User, Group, Participant, Winner, Event, Setting };
