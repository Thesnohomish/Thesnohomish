-- Preload the shared public.categories records used by both admin and storefront.
-- Existing category rows are reused by slug or case-insensitive name.
do $$
declare
  category_record record;
  existing_id uuid;
begin
  for category_record in
    select * from (values
      ('Champagne & Sparkling','champagne',10),
      ('Wine','wine',20),
      ('Whisky & Whiskey','whisky',30),
      ('Cognac & Brandy','brandy',40),
      ('Gin','gin',50),
      ('Liqueurs & Creams','liqueur',60),
      ('Rum','rum',70),
      ('Tequila & Mezcal','tequila',80),
      ('Vodka','vodka',90)
    ) as requested(name,slug,sort_order)
  loop
    select id into existing_id
    from public.categories
    where slug=category_record.slug or lower(name)=lower(category_record.name)
    order by (slug=category_record.slug) desc
    limit 1;

    if existing_id is null then
      insert into public.categories(name,slug,sort_order,is_active)
      values(category_record.name,category_record.slug,category_record.sort_order,true);
    else
      update public.categories
      set name=category_record.name,
          slug=category_record.slug,
          sort_order=category_record.sort_order,
          is_active=true,
          updated_at=now()
      where id=existing_id;
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
