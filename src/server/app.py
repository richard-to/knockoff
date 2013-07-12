import copy
import json
import os

from flask import Flask, render_template, request, session

SECRET_KEY = 'Secret Key'
DEBUG = True

app = Flask(__name__)

currentUser = {
	'name': 'John Doe'
}

storageUsers = {
	'John Doe': {
		'id': 1,
		'name': 'John Doe',
		'avatar': 'http://www.gravatar.com/avatar/0ab06730a57651a0e965008aac134102?d=identicon'
	},
	'Jane Doe': {
		'id': 2,
		'name': 'Jane Doe',
		'avatar': 'http://www.gravatar.com/avatar/910db02478c40c6d54962268f613fa22?d=identicon'
	}
}

storageMsg = [
	{'id': 0, 'name': 'John Doe', 'msg': 'Hello world!', 'published': True, 'rating': None, 'rating_reason': ''},
	{'id': 1, 'name': 'Jane Doe', 'msg': 'Woe is me...', 'published': True, 'rating': None, 'rating_reason': ''},
]

def save_msg(data):
	msg = copy.deepcopy(data)
	del msg['isOwner']
	storageMsg.append(msg)
	return msg

def msg_to_view_model(msg, user):
	vm = copy.deepcopy(msg)
	vm['isOwner'] = (vm['name'] == user['name'])
	return vm

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
	return json.dumps(msg_to_view_model(draft, currentUser))

@app.route('/api/msgs/<int:msg_id>/rate', methods=['PUT'])
def api_msgs_rate(msg_id):
	data = json.loads(request.data)
	storageMsg[msg_id]['rating'] = data['rating']
	storageMsg[msg_id]['rating_reason'] = data['rating_reason']
	return json.dumps(msg_to_view_model(storageMsg[msg_id], currentUser))

@app.route('/api/msgs/<int:msg_id>', methods=['PUT'])
def api_msgs_save(msg_id):
	data = json.loads(request.data)
	msg = save_msg(data)
	return json.dumps(msg_to_view_model(msg, currentUser))

@app.route('/api/msgs', methods=['POST'])
def api_msgs_new():
	data = json.loads(request.data)
	data['id'] = len(storageMsg)
	msg = save_msg(data)
	return json.dumps(msg_to_view_model(msg, currentUser))

@app.route('/api/msgs')
def api_msgs():
	data = []
	for row in storageMsg:
		if row['published']:
			data.append(msg_to_view_model(row, currentUser))
	return json.dumps(data)

@app.route('/')
def index():
    return render_template('index.html')

def main():
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)


if __name__ == '__main__':
    main()