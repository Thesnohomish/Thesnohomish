#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const csvPath = process.env.PRODUCT_CSV_PATH;
if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required.');
if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
if (!csvPath) throw new Error('PRODUCT_CSV_PATH is required.');

function parseCsv(text) {
  const rows=[]; let row=[],cell='',quoted=false;
  for(let index=0;index<text.length;index+=1){const char=text[index],next=text[index+1];if(char==='"'&&quoted&&next==='"'){cell+='"';index+=1;}else if(char==='"'){quoted=!quoted;}else if(char===','&&!quoted){row.push(cell);cell='';}else if((char==='\n'||char==='\r')&&!quoted){if(char==='\r'&&next==='\n')index+=1;row.push(cell);if(row.some(value=>value.trim()))rows.push(row);row=[];cell='';}else cell+=char;} row.push(cell);if(row.some(value=>value.trim()))rows.push(row);
  const headers=(rows.shift()||[]).map(value=>value.trim().toLowerCase());
  return rows.map(values=>Object.fromEntries(headers.map((header,index)=>[header,(values[index]||'').trim()])));
}
const slugify=value=>value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
const booleanValue=value=>['true','1','yes','active','published','available'].includes(String(value).toLowerCase());
const supabase=createClient(url,serviceRoleKey,{auth:{autoRefreshToken:false,persistSession:false}});
const {data:categories,error:categoryError}=await supabase.from('categories').select('id,name,slug');
if(categoryError)throw categoryError;
const categoryByName=new Map((categories||[]).map(category=>[category.name.trim().toLowerCase(),category]));
const rows=parseCsv(await readFile(csvPath,'utf8'));
let imported=0,headingsSkipped=0;
for(const [index,row] of rows.entries()){
  const name=row.name?.trim(), categoryName=(row.category||row.category_name||'').trim();
  const price=Number(row.price), hasProductData=Boolean(name&&row.slug&&Number.isFinite(price));
  if(!hasProductData){headingsSkipped+=1;continue;}
  const category=categoryByName.get(categoryName.toLowerCase());
  if(!category)throw new Error(`Row ${index+2}: category “${categoryName}” does not match public.categories.name.`);
  const sku=(row.sku||'').trim()||null, size=(row.bottle_size||row.size||'').trim();
  const baseSlug=slugify(row.slug||name), uniqueSuffix=slugify(sku||size);
  const slug=uniqueSuffix&&!baseSlug.endsWith(uniqueSuffix)?`${baseSlug}-${uniqueSuffix}`:baseSlug;
  const payload={name,slug,category_id:category.id,price,stock:Math.max(0,Number.parseInt(row.stock_quantity||row.stock||'0',10)||0),is_active:row.is_active?booleanValue(row.is_active):true,description:row.description||null,country:row.country||null,bottle_size:size||null,sku,image_url:row.image_url||null};
  const existingQuery=sku?supabase.from('products').select('id').eq('sku',sku).maybeSingle():supabase.from('products').select('id').eq('slug',slug).maybeSingle();
  const {data:existing,error:lookupError}=await existingQuery;
  if(lookupError)throw new Error(`Row ${index+2} (${name}) lookup: ${lookupError.message}`);
  const result=existing?await supabase.from('products').update(payload).eq('id',existing.id):await supabase.from('products').insert(payload);
  if(result.error)throw new Error(`Row ${index+2} (${name}): ${result.error.message}`);
  imported+=1;
}
console.log(JSON.stringify({imported,categoryHeadingsSkipped:headingsSkipped},null,2));
