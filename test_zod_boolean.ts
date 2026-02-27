import { z } from 'zod';

const schema = z.coerce.boolean();

console.log('true:', schema.parse('true'));
console.log('false:', schema.parse('false'));
console.log('1:', schema.parse('1'));
console.log('0:', schema.parse('0'));
