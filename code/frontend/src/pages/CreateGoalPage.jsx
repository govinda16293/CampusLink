import { useNavigate } from 'react-router-dom';
import { goalsApi } from '../api/goals';
import { GoalForm } from '../components/GoalForm';

export function CreateGoalPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-[2rem] font-bold leading-tight tracking-tight text-label">Post a goal</h1>
      <p className="mt-2 text-[15px] text-label-on-backdrop">
        Say what you want to do and how many people you need. It goes on the campus feed straight
        away.
      </p>

      <GoalForm
        submitLabel="Post goal"
        submittingLabel="Posting…"
        onCancel={() => navigate('/')}
        onSubmit={async (payload) => {
          const { goal } = await goalsApi.create(payload);
          navigate(`/goals/${goal.id}`, { replace: true });
        }}
      />
    </div>
  );
}
