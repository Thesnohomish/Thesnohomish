-- Keep the stored account balance consistent with the rounded points shown on products.
-- KSh 1,000 earns 10 points, so KSh 680 earns 6.8 points and rounds to 7.
create or replace function public.apply_order_reward_points() returns trigger
language plpgsql security definer set search_path=public as $$
declare account_id uuid; earned integer; inserted_id uuid; earned_points integer;
begin
  if new.customer_id is null then return new; end if;
  insert into public.reward_accounts(customer_id) values(new.customer_id)
  on conflict(customer_id) do update set updated_at=now()
  returning id into account_id;

  if new.status='delivered' and old.status is distinct from 'delivered' then
    earned := round(greatest(new.total,0)/100)::integer;
    if earned > 0 then
      insert into public.reward_transactions(reward_account_id,order_id,transaction_type,points,description)
      values(account_id,new.id,'order_earned',earned,'Points earned for delivered order '||coalesce(new.order_number,new.id::text))
      on conflict do nothing returning id into inserted_id;
      if inserted_id is not null then
        update public.reward_accounts
        set points_balance=points_balance+earned,
            lifetime_points=lifetime_points+earned,
            updated_at=now()
        where id=account_id;
      end if;
    end if;
    new.delivered_at := coalesce(new.delivered_at,now());
  elsif new.status='refunded' and old.status is distinct from 'refunded' then
    select points into earned_points
    from public.reward_transactions
    where order_id=new.id and transaction_type='order_earned';
    if coalesce(earned_points,0)>0 then
      insert into public.reward_transactions(reward_account_id,order_id,transaction_type,points,description)
      values(account_id,new.id,'refund_reversal',-earned_points,'Points removed for refunded order '||coalesce(new.order_number,new.id::text))
      on conflict do nothing returning id into inserted_id;
      if inserted_id is not null then
        update public.reward_accounts
        set points_balance=greatest(0,points_balance-earned_points),updated_at=now()
        where id=account_id;
      end if;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists orders_apply_reward_points on public.orders;
create trigger orders_apply_reward_points
before update of status on public.orders
for each row execute function public.apply_order_reward_points();
