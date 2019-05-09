exports.timeSince = function (date) {
  new_date = new Date(date);
  console.log(date + ":" + new_date);
  var seconds = Math.floor((new Date() - new_date) / 1000);
  var interval = Math.floor(seconds / 31536000);
  if (interval >= 1) {
    if (interval == 1) return interval + " year ago";
    return interval + " years ago";
  }
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) {
    if (interval == 1) return interval + " month ago";
    return interval + " months ago";
  }
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) {
    if (interval == 1) return interval + " day ago";
    return interval + " days ago";
  }
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) {
    if (interval == 1) return interval + " hour ago";
    return interval + " hours ago";
  }
  interval = Math.floor(seconds / 60);
  if (interval >= 1) {
    if (interval == 1) return interval + " minute ago";
    return interval + " minutes ago";
  }
  if (interval == 1) return Math.floor(seconds) + " second ago";
  return Math.floor(seconds) + " seconds ago";
}