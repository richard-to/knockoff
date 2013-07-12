import copy
import json
import os

from flask import Flask, render_template, request, session

SECRET_KEY = 'Secret Key'
DEBUG = True

app = Flask(__name__)
app.config.from_object(__name__)

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
	{
		'id': 0,
		'name': 'John Doe',
		'avatar': 'http://www.gravatar.com/avatar/0ab06730a57651a0e965008aac134102?d=identicon',
		'msg': 'Hello world!',
		'published': True,
		'rating': None,
	},
	{
		'id': 1,
		'name': 'Jane Doe',
		'avatar': 'http://www.gravatar.com/avatar/910db02478c40c6d54962268f613fa22?d=identicon',
		'msg': 'Woe is me...',
		'published': True,
		'rating': None
	},
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

def user_to_view_model(user):
	vm = copy.deepcopy(user)
	vm['isLoggedIn'] = True
	return vm

@app.route('/api/users/login', methods=['POST'])
def api_users_login():
	data = json.loads(request.data)
	if data['name'] in storageUsers:
		session['user'] = storageUsers[data['name']]
		session['logged_in'] = True
		return json.dumps(user_to_view_model(session['user']))
	else:
		return json.dumps(data)

@app.route('/api/msgs/draft')
def api_msgs_draft():
	draft = None
	for row in storageMsg:
		if session['user']['name'] == row['name'] and row['published'] == False:
			draft = row
			break

	if draft is None:
		draft = {
			'name': session['user']['name'],
			'avatar': session['user']['avatar'],
			'msg': '',
			'published': False,
			'rating': None
		}
		draft['id'] = len(storageMsg)
		storageMsg.append(draft)
	return json.dumps(msg_to_view_model(draft, session['user']))

@app.route('/api/msgs/<int:msg_id>/rate', methods=['PUT'])
def api_msgs_rate(msg_id):
	data = json.loads(request.data)
	storageMsg[msg_id]['rating'] = data['rating']
	return json.dumps(msg_to_view_model(storageMsg[msg_id], session['user']))

@app.route('/api/msgs/<int:msg_id>', methods=['PUT'])
def api_msgs_save(msg_id):
	data = json.loads(request.data)
	msg = save_msg(data)
	return json.dumps(msg_to_view_model(msg, session['user']))

@app.route('/api/msgs', methods=['POST'])
def api_msgs_new():
	data = json.loads(request.data)
	data['id'] = len(storageMsg)
	msg = save_msg(data)
	return json.dumps(msg_to_view_model(msg, session['user']))

@app.route('/api/msgs')
def api_msgs():
	data = []
	for row in storageMsg:
		if row['published']:
			data.append(msg_to_view_model(row, session['user']))
	return json.dumps(data)

@app.route('/')
def index():
    return render_template('index.html')

def main():
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)


if __name__ == '__main__':
    main()