import requests
import json

# 测试 api.searchVideos() 方法
def test_search_videos():
    try:
        response = requests.get('https://cloudtv.aisxuexi.com/api/search?q=复仇之渊')
        data = response.json()
        results = data.get('results', [])
        print('搜索结果数量:', len(results))
        for index, item in enumerate(results):
            print(f'\n结果 {index}:')
            print(f'  source: {item.get("source")}')
            print(f'  source_name: {item.get("source_name")}')
            print(f'  title: {item.get("title")}')
            print(f'  episodes 数量: {len(item.get("episodes", []))}')
            print(f'  episodes: {item.get("episodes")}')
    except Exception as error:
        print('搜索失败:', error)

test_search_videos()