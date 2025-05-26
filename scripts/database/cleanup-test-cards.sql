-- SQL Script to delete test recharge cards

-- Delete the test cards from the database
DELETE FROM public.recharge_cards WHERE code IN (
  'QVS2DWE4BA', '5L9MLFA8XB', '37IQJYLDSS', 'A4DJKQIAAT', '7QAX6ZVJC1',
  'ST01U2UOZV', 'UAR7XVY4Q6', 'UWATA2YH7V', 'XLMU3U82QX', 'NF740IY222'
); 