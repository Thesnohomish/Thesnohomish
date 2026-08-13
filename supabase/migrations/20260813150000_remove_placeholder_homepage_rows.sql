-- Start homepage merchandising with a clean slate. The merchant will create
-- every product/category row from Admin > Homepage rows.
begin;

delete from public.homepage_product_sections;

commit;
