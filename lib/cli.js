export function displayTasks(tasks) {
  for (const task of tasks) {
    console.log(
      `${task.id} | ${task.title} | uploaded=${task.additional?.transfer?.size_uploaded ?? 0}`
    );
  }
}

export function validateRemoveArgs(titlesArg) {
  if (!titlesArg) {
    throw new Error('Provide titles CSV: ds-torrents remove "title1,title2"');
  }
}

export function findTaskIdsByTitles(titlesArg, tasks) {
  const tasksMap = new Map(tasks.map((task) => [task.title, task]));
  const ids = titlesArg.split(",").map((title) => tasksMap.get(title)?.id).filter(Boolean);

  if (ids.length === 0) {
    throw new Error("No valid task IDs found for the provided titles");
  }

  return ids;
}

export function validatePurgeArgs(sizeArg) {
  if (!sizeArg) {
    throw new Error('Provide size in GB: ds-torrents purge "10.5"');
  }

  const sizeGB = parseFloat(sizeArg);
  if (isNaN(sizeGB) || sizeGB <= 0) {
    throw new Error("Size must be a positive number in GB");
  }

  return sizeGB;
}

export function validateInfoArgs(titleArg) {
  if (!titleArg) {
    throw new Error('Provide title: ds-torrents info "torrent_title"');
  }
  return titleArg;
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1000; // Use decimal (SI) units instead of binary
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A';
  return new Date(timestamp * 1000).toLocaleString();
}

export function displayTaskInfo(task) {
  console.log('=== Task Information ===');
  console.log(`ID: ${task.id}`);
  console.log(`Title: ${task.title}`);
  console.log(`Status: ${task.status}`);
  console.log(`Size: ${formatBytes(task.size)}`);
  console.log(`Type: ${task.type}`);

  if (task.additional?.detail) {
    const detail = task.additional.detail;
    console.log('\n=== Details ===');
    console.log(`Created: ${formatTimestamp(detail.created_time)}`);
    console.log(`Completed: ${formatTimestamp(detail.completed_time)}`);
    console.log(`Priority: ${detail.priority}`);
    console.log(`Destination: ${detail.destination}`);
  }

  if (task.additional?.transfer) {
    const transfer = task.additional.transfer;
    console.log('\n=== Transfer Info ===');
    console.log(`Downloaded: ${formatBytes(transfer.size_downloaded)}`);
    console.log(`Uploaded: ${formatBytes(transfer.size_uploaded)}`);
    console.log(`Ratio: ${transfer.size_downloaded === 0 ? 'N/A' : (transfer.size_uploaded / transfer.size_downloaded).toFixed(3)}`);
    console.log(`Speed Download: ${formatBytes(transfer.speed_download)}/s`);
    console.log(`Speed Upload: ${formatBytes(transfer.speed_upload)}/s`);
  }

  if (task.additional?.file) {
    const files = task.additional.file;
    console.log('\n=== Files ===');
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file.filename} (${formatBytes(file.size)})`);
    });
  }

  if (task.additional?.tracker) {
    const trackers = task.additional.tracker;
    console.log('\n=== Trackers ===');
    trackers.forEach((tracker, index) => {
      console.log(`${index + 1}. ${tracker.url} (${tracker.status})`);
    });
  }

  if (task.additional?.peer) {
    const peers = task.additional.peer;
    console.log('\n=== Peers ===');
    console.log(`Connected: ${peers.length}`);
  }
}