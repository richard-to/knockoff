import json
import os

from flask import Flask, render_template, request


app = Flask(__name__)

currentUser = {'name': 'John Doe'}

storageMsg = [
	{'id': 0, 'name': 'John Doe', 'msg': 'Hello world!', 'published': True, 'rating': None, 'rating_reason': ''},
	{'id': 1, 'name': 'Jane Doe', 'msg': 'Woe is me...', 'published': True, 'rating': None, 'rating_reason': ''},
]

@app.route('/api/msgs/draft')
def api_msgs_draft():
	draft = None
	for row in storageMsg:
		if row['published'] == False:
			draft = row
			break

	if draft is None:
		draft = {'name': currentUser['name'], 'msg': '', 'published': False, 'rating': None, 'rating_reason': ''}
		draft['id'] = len(storageMsg)
		storageMsg.append(draft)
	return json.dumps(draft)

@app.route('/api/msgs/<int:msg_id>/rate', methods=['PUT'])
def api_msgs_rate(msg_id):
	data = json.loads(request.data)
	storageMsg[msg_id]['rating'] = data['rating']
	storageMsg[msg_id]['rating_reason'] = data['rating_reason']
	return json.dumps(storageMsg[msg_id])

@app.route('/api/msgs/<int:msg_id>', methods=['PUT'])
def api_msgs_save(msg_id):
	data = json.loads(request.data)
	storageMsg[msg_id] = data
	return json.dumps(data)

@app.route('/api/msgs', methods=['POST'])
def api_msgs_new():
	data = json.loads(request.data)
	data['id'] = len(storageMsg)
	storageMsg.append(data)
	return json.dumps(data)

@app.route('/api/msgs')
def api_msgs():
	data = []
	for row in storageMsg:
		if row['published']:
			data.append(row)
	return json.dumps(data)

@app.route('/')
def index():
    return render_template('index.html')

def main():
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)


if __name__ == '__main__':
    main()