from tensorflow import Session
from tensorflow.compat.v1 import get_default_graph
from tensorflow.keras.models import load_model
from tensorflow.keras.backend import set_session
import pickle
import os
CLASSIFICATION_MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "text_classification.h5")
MODEL_ENCODER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "encoder.pickle")
MODEL_TOKENIZER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tokenizer.pickle")

class TextClassification:

    def __init__(self):
        self.sess = Session()
        self.graph = get_default_graph()
        set_session(self.sess)
        self.model = load_model(CLASSIFICATION_MODEL_PATH)
        self.encoder = pickle.load(open(MODEL_ENCODER, 'rb'))
        self.tokenizer = pickle.load(open(MODEL_TOKENIZER, 'rb'))

    def get_session(self):
        return self.sess


    @property
    def get_graph(self):
        return self.graph

    def get_model(self):
        return self.model

    def get_tokenizer(self):
        return self.tokenizer

    def get_encoder_classes(self):
        return self.encoder.classes_

    

    
