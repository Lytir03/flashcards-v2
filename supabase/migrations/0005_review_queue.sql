-- =============================================================================
-- Approving a card puts it in the review queue.
--
-- Done with a trigger rather than in application code because there are
-- already three paths that approve a card — one at a time, "approve all",
-- "approve only the unflagged" — and a fourth (manually written cards) is
-- coming. Every one of them would have to remember to create the SM-2 state,
-- and the failure mode of forgetting is silent: the card looks approved and
-- simply never comes up for review. In the database it cannot drift.
-- =============================================================================

create or replace function public.enqueue_approved_card()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.status = 'approved' then
    insert into public.card_states (user_id, flashcard_id, deck_id, due_on, state)
    values (new.owner_id, new.id, new.deck_id, current_date, 'new')
    on conflict (user_id, flashcard_id) do nothing;
  end if;
  return null;
end;
$$;

-- Fires on approval and on a card created already-approved. Not on every
-- update: the WHEN clause keeps edits to an approved card from re-running it.
create trigger flashcards_enqueue_trg
  after insert or update of status on public.flashcards
  for each row
  when (new.status = 'approved')
  execute function public.enqueue_approved_card();

-- Existing approved cards predate the trigger; give them their state.
insert into public.card_states (user_id, flashcard_id, deck_id, due_on, state)
select f.owner_id, f.id, f.deck_id, current_date, 'new'
from public.flashcards f
where f.status = 'approved'
on conflict (user_id, flashcard_id) do nothing;
