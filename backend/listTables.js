import mysql from 'mysql2/promise';
async function main() {
  const url = 'mysql://21BgP4L6KQ7yMqC.root:fl9qOdRUYhznaevP@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/test?ssl={"rejectUnauthorized":true}';
  const conn = await mysql.createConnection(url);
  const [rows] = await conn.query('SHOW TABLES');
  console.log(rows);
  await conn.end();
}
main();
