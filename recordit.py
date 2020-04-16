import argparse
import os
import traceback

import gRPC_client

from flask import Flask, request, render_template, send_from_directory


parser = argparse.ArgumentParser()
parser.add_argument('--host', default='127.0.0.1')
parser.add_argument('--port', default=8001, type=int)
parser.add_argument('--api_addr', default='127.0.0.1:50051')
args = parser.parse_args()
app = Flask(__name__)


@app.route('/')
def index_html():
    return render_template('index.html')

@app.route('/client', methods=['POST'])
def post_to_gRPC_client():
    audio = request.files['audioFile']
    audio_data = audio.read()
    audio.close()
    
    try:
        with gRPC_client.Client(args.api_addr) as d:
            return d.input(audio_data)
    except Exception as e:
        return traceback.format_exc(), 500


if __name__ == '__main__':
    app.run(host=args.host, port=args.port, debug=True)
