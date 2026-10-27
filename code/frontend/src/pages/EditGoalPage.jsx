import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { updateGoalSchema } from '@campuslink/shared';
import { goalsApi } from '../api/goals';
import { GoalForm } from '../components/GoalForm';
import { Alert } from '../components/ui/Alert';

/**
 * Editing a goal that is already posted.
 *
 * Before this existed, fixing a time meant cancelling and reposting, which threw away the lobby
 * and every message in it. The form is the same component as posting; only the rules differ —
 * the headcount cannot go below the people already in, and anonymity is locked once anybody has
 * seen who the poster is.
 *
 * Changing the time writes a line into the group chat. That is the server's doing, not this
 * page's, so it happens whether the edit came from here or from anywhere else.
 */
export function EditGoalPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading', goal: null, error: null });

  useEffect(() => {
    let cancelled = false;
    goalsApi
      .byId(id)
      .then(({ goal }) => !cancelled && setState({ status: 'ready', goal, error: null }))
      .catch((error) => !cancelled && setState({ status: 'error', goal: null, error }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === 'loading') {
    return <p className="py-16 text-center text-sm text-label-secondary">Loading…</p>;
  }
  if (state.status === 'error') {
    return <Alert tone="error">{state.error.message}</Alert>;
  }

  const { goal } = state;

  if (!goal.isOwnGoal) {
    return <Alert tone="error">That is not your goal to edit.</Alert>;
  }
  if (goal.status === 'COMPLETED' || goal.status === 'CANCELLED') {
    return (
      <Alert tone="info">
        This goal has already finished, so it cannot be edited. It stays as a record of what
        happened.
      </Alert>
    );
  }

  const joined = goal.acceptedCount;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-[2rem] font-bold leading-tight tracking-tight text-label">
        Edit this goal
      </h1>
      <p className="mt-2 text-[15px] text-label-on-backdrop">
        {joined > 0
          ? `${joined} ${joined === 1 ? 'person has' : 'people have'} joined. If you change the time, everyone in the group is told in the chat.`
          : 'Nobody has joined yet, so you can change anything.'}
      </p>

      <GoalForm
        schema={updateGoalSchema}
        initialValues={{
          category: goal.category,
          title: goal.title,
          description: goal.description,
          dateTime: goal.dateTime,
          headcount: goal.headcount,
          anonymous: goal.anonymous,
          genderPreference: goal.genderPreference,
          autoAccept: goal.autoAccept,
        }}
        minHeadcount={Math.max(1, joined)}
        lockedReason={
          joined > 0 && !goal.anonymous
            ? 'People have already joined and seen who you are, so this cannot be hidden now.'
            : null
        }
        submitLabel="Save changes"
        submittingLabel="Saving…"
        onCancel={() => navigate(`/goals/${goal.id}`)}
        onSubmit={async (payload) => {
          await goalsApi.update(goal.id, payload);
          navigate(`/goals/${goal.id}`, { replace: true });
        }}
      />
    </div>
  );
}
