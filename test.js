import mongoose from 'mongoose';

const TestSchema = new mongoose.Schema({
    testNestedFieldOne: {
        testFieldOne: { type: String, required: true },
        testFieldTwo: { type: String, required: true }
    },
    testNestedFieldTwo: {
        testFieldThree: { type: String, required: true },
        testFieldFour: { type: String, required: true }
    }
}, { collection: 'Test'});

export const Test = mongoose.model('Test', TestSchema);