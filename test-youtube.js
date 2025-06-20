require('dotenv').config();

// Test YouTube API functionality
async function testYouTubeAPI() {
  console.log('Testing YouTube API functionality...');
  console.log('YouTube API Key:', process.env.YOUTUBE_API_KEY ? 'Configured' : 'Not configured');
  
  if (!process.env.YOUTUBE_API_KEY) {
    console.log('❌ YouTube API key not found in environment variables');
    return;
  }

  try {
    // Test search functionality
    const searchQuery = 'cardio workout fitness exercise';
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(searchQuery)}&type=video&videoDuration=medium&videoDefinition=high&key=${process.env.YOUTUBE_API_KEY}`;
    
    console.log('\n🔍 Testing YouTube search...');
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    if (searchData.error) {
      console.log('❌ YouTube API Error:', searchData.error);
      return;
    }
    
    if (!searchData.items || searchData.items.length === 0) {
      console.log('❌ No videos found in search results');
      return;
    }
    
    console.log('✅ Search successful! Found', searchData.items.length, 'videos');
    
    // Test video details functionality
    const videoIds = searchData.items.map(item => item.id.videoId).join(',');
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoIds}&key=${process.env.YOUTUBE_API_KEY}`;
    
    console.log('\n📊 Testing video details...');
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();
    
    if (detailsData.error) {
      console.log('❌ Video details API Error:', detailsData.error);
      return;
    }
    
    console.log('✅ Video details successful!');
    
    // Process and display sample results
    console.log('\n📺 Sample workout videos found:');
    searchData.items.forEach((item, index) => {
      const details = detailsData.items?.find(d => d.id === item.id.videoId);
      const duration = details ? parseDuration(details.contentDetails.duration) : 'Unknown';
      const viewCount = details ? formatViewCount(details.statistics.viewCount) : 'Unknown';
      
      console.log(`${index + 1}. ${item.snippet.title}`);
      console.log(`   Channel: ${item.snippet.channelTitle}`);
      console.log(`   Duration: ${duration}`);
      console.log(`   Views: ${viewCount}`);
      console.log(`   Video ID: ${item.id.videoId}`);
      console.log('');
    });
    
    console.log('🎉 YouTube API integration is working perfectly!');
    console.log('✅ The workouts page should be able to search and display real YouTube videos.');
    
  } catch (error) {
    console.log('❌ Error testing YouTube API:', error.message);
  }
}

// Helper functions
function parseDuration(duration) {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  
  const hours = (match[1] || '').replace('H', '');
  const minutes = (match[2] || '').replace('M', '');
  const seconds = (match[3] || '').replace('S', '');
  
  if (hours) {
    return `${hours}h ${minutes || '0'}m`;
  } else if (minutes) {
    return `${minutes} min`;
  } else {
    return `${seconds} sec`;
  }
}

function formatViewCount(viewCount) {
  const count = parseInt(viewCount);
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}

// Run the test
testYouTubeAPI();