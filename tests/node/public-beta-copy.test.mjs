import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = file => fs.readFileSync(file, 'utf8');

test('public beta landing feedback statuses stay readable across supported locales', () => {
  const source = read('src/public-beta.js');
  for (const phrase of [
    '正在提交...',
    'Received. Thank you for explaining the issue clearly.',
    '受け付けました。詳しく教えていただきありがとうございます。',
    '접수했습니다. 문제를 자세히 알려주셔서 감사합니다.',
  ]) {
    assert.ok(source.includes(phrase), `missing readable feedback status: ${phrase}`);
  }
  for (const corrupted of ['姝ｅ湪鎻愪氦', 'Submitting鈥?', '閫佷俊涓€?', '鞝勳啞 欷戔€?']) {
    assert.ok(!source.includes(corrupted), `corrupted status text still present: ${corrupted}`);
  }
});

test('legacy beta feedback dialog copy stays readable across supported locales', () => {
  const source = read('src/beta-feedback.js');
  for (const phrase of [
    '告诉我们哪里不好用',
    'Tell us what gets in your way',
    '使いにくかった点を教えてください',
    '어디가 불편했는지 알려주세요',
  ]) {
    assert.ok(source.includes(phrase), `missing readable dialog copy: ${phrase}`);
  }
  for (const corrupted of ['鍛婅瘔鎴戜滑鍝噷涓嶅ソ鐢?', 'week鈥檚', '銉曘偅銉笺儔銉愩儍銈?', '頂茧摐氚?']) {
    assert.ok(!source.includes(corrupted), `corrupted dialog copy still present: ${corrupted}`);
  }
});
