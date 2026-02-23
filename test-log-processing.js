// 测试log.json处理功能
const fs = require('fs');
const path = require('path');

// 模拟processLogJsonAndUpdateSteps函数
async function testProcessLogJson() {
  const testCaseId = '569735e5-df82-4ea6-ad22-4a4adc752379';
  const logJsonPath = path.join(__dirname, 'data', 'automation', testCaseId, 'log.json');
  
  console.log('开始处理log.json文件:', logJsonPath);
  
  // 检查文件是否存在
  if (!fs.existsSync(logJsonPath)) {
    console.log('log.json文件不存在:', logJsonPath);
    return;
  }
  
  // 读取log.json文件
  const logContent = fs.readFileSync(logJsonPath, 'utf-8');
  const logData = JSON.parse(logContent);
  console.log('成功读取log.json文件，数据长度:', JSON.stringify(logData).length);
  
  // 分析数据结构
  console.log('数据结构分析:');
  console.log('- groupName:', logData.groupName);
  console.log('- executions数量:', logData.executions ? logData.executions.length : 0);
  
  if (logData.executions && logData.executions.length > 0) {
    logData.executions.forEach((execution, index) => {
      console.log(`\n执行 ${index + 1}:`);
      console.log('- name:', execution.name);
      console.log('- tasks数量:', execution.tasks ? execution.tasks.length : 0);
      
      if (execution.tasks) {
        execution.tasks.forEach((task, taskIndex) => {
          console.log(`  任务 ${taskIndex + 1}:`);
          console.log('  - type:', task.type);
          console.log('  - subType:', task.subType);
          console.log('  - status:', task.status);
          console.log('  - param:', task.param ? JSON.stringify(task.param).substring(0, 100) : 'N/A');
          console.log('  - recorder数量:', task.recorder ? task.recorder.length : 0);
          
          if (task.recorder) {
            task.recorder.forEach((record, recordIndex) => {
              console.log(`    记录 ${recordIndex + 1}:`);
              console.log('    - type:', record.type);
              if (record.screenshot) {
                console.log('    - 截图长度:', record.screenshot.length);
                console.log('    - 截图前缀:', record.screenshot.substring(0, 50));
              }
            });
          }
        });
      }
    });
  }
}

testProcessLogJson().catch(console.error);
